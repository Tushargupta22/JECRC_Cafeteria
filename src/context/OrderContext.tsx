import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { KitchenTicket } from '../data/mockData';
import { orderApi, BackendOrder } from '../services/api';
import { mapBackendOrderToKitchenTicket } from './AdminKitchenContext';
import { useStudent } from './StudentContext';

interface OrderContextType {
  activeOrder: KitchenTicket | null;
  activeBackendOrder: BackendOrder | null;
  secondsRemaining: number;
  isReceiptModalOpen: boolean;
  orderHistory: KitchenTicket[];
  isLoadingOrders: boolean;
  setIsReceiptModalOpen: (open: boolean) => void;
  createOrderFromCart: (
    cartItems: any[],
    total?: number,
    couponCode?: string,
    paymentMethod?: string
  ) => Promise<KitchenTicket>;
  updateOrderStatus: (status: KitchenTicket['status']) => void;
  fetchUserOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { refreshUser, isAuthenticated } = useStudent();
  const [activeOrder, setActiveOrder] = useState<KitchenTicket | null>(null);
  const [activeBackendOrder, setActiveBackendOrder] = useState<BackendOrder | null>(null);
  const [orderHistory, setOrderHistory] = useState<KitchenTicket[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(360);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);

  // Fetch orders from MongoDB only for authenticated user
  const fetchUserOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setOrderHistory([]);
      setActiveOrder(null);
      setActiveBackendOrder(null);
      return;
    }

    try {
      setIsLoadingOrders(true);
      const res = await orderApi.getOrders();
      if (res && res.orders) {
        const mapped = res.orders.map(mapBackendOrderToKitchenTicket);
        setOrderHistory(mapped);

        // If no active order or active order is completed, set latest uncompleted order if exists
        const uncompleted = mapped.find(o => o.status !== 'completed');
        if (uncompleted && (!activeOrder || activeOrder.status === 'completed')) {
          setActiveOrder(uncompleted);
          const raw = res.orders.find(o => o._id === uncompleted.id);
          if (raw) setActiveBackendOrder(raw);
        } else if (!activeOrder && mapped.length > 0) {
          setActiveOrder(mapped[0]);
          const raw = res.orders.find(o => o._id === mapped[0].id);
          if (raw) setActiveBackendOrder(raw);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [activeOrder, isAuthenticated]);

  useEffect(() => {
    fetchUserOrders();
  }, [isAuthenticated, fetchUserOrders]);

  // Live polling on active order
  useEffect(() => {
    if (!isAuthenticated || !activeOrder || activeOrder.status === 'completed' || activeOrder.id.startsWith('ticket-')) return;

    const timer = setInterval(async () => {
      try {
        const res = await orderApi.getOrder(activeOrder.id);
        if (res && res.order) {
          const updatedTicket = mapBackendOrderToKitchenTicket(res.order);
          setActiveBackendOrder(res.order);
          
          if (updatedTicket.status !== activeOrder.status) {
            setActiveOrder(updatedTicket);
            if (updatedTicket.status === 'completed') {
              // Order completed! Refresh student profile for updated loyalty coins
              refreshUser();
            }
          }
        }
      } catch (err) {
        // Silently handle polling errors
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [activeOrder, refreshUser]);

  // ETA Countdown timer - STOP when order becomes Ready or Completed
  useEffect(() => {
    // Stop countdown if order is Ready, Completed, or time expired
    if (!activeOrder || activeOrder.status === 'ready' || activeOrder.status === 'completed' || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeOrder, secondsRemaining]);

  // Create real order on backend
  const createOrderFromCart = async (
    cartItems: any[],
    _total?: number,
    couponCode?: string,
    paymentMethod = 'Campus UPI (Razorpay)'
  ): Promise<KitchenTicket> => {
    // Format items for backend API
    const itemsPayload = cartItems.map(ci => {
      // Support both { item: MenuItem, quantity } and { foodId/id, name, quantity }
      const foodId = ci.item?.id || ci.foodId || ci.id;
      const quantity = ci.quantity || 1;
      
      // Validate foodId is not a mock/string ID
      if (typeof foodId === 'string' && (
        foodId.includes('-') || 
        foodId.length < 20 || 
        !foodId.match(/^[0-9a-fA-F]{24}$/)
      )) {
        console.warn('[Order] Invalid foodId detected:', foodId, 'Item:', ci.item?.name);
        throw new Error(
          `Invalid menu data detected. Please refresh the page (Ctrl+Shift+R) and try again. Item: ${ci.item?.name || 'Unknown'}`
        );
      }
      
      return {
        foodId,
        quantity,
        notes: ci.notes || ''
      };
    });

    try {
      const res = await orderApi.createOrder({
        items: itemsPayload,
        couponCode: couponCode || undefined,
        paymentMethod
      });

      const newTicket = mapBackendOrderToKitchenTicket(res.order);
      setActiveOrder(newTicket);
      setActiveBackendOrder(res.order);
      setSecondsRemaining((res.order.etaMinutes ?? 8) * 60);
      setIsReceiptModalOpen(true);
      setOrderHistory(prev => [newTicket, ...prev]);

      // Refresh student statistics
      refreshUser();

      return newTicket;
    } catch (error: any) {
      // Better error messages for common issues
      if (error.message?.includes('Invalid food ID') || error.message?.includes('Invalid ID format')) {
        throw new Error(
          'Menu data is outdated. Please refresh the page (Ctrl+Shift+R) and try ordering again.'
        );
      }
      throw error;
    }
  };

  const updateOrderStatus = (status: KitchenTicket['status']) => {
    if (!activeOrder) return;
    setActiveOrder(prev => (prev ? { ...prev, status } : null));
  };

  return (
    <OrderContext.Provider
      value={{
        activeOrder,
        activeBackendOrder,
        secondsRemaining,
        isReceiptModalOpen,
        orderHistory,
        isLoadingOrders,
        setIsReceiptModalOpen,
        createOrderFromCart,
        updateOrderStatus,
        fetchUserOrders
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
