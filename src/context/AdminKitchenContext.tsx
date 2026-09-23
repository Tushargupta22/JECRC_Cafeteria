import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { KitchenTicket, MenuItem } from '../data/mockData';
import { foodApi, orderApi, BackendFood, BackendOrder } from '../services/api';
import { useStudent } from './StudentContext';

export const mapBackendFoodToMenuItem = (food: BackendFood): MenuItem => {
  const stock = typeof food.stockCount === 'number' ? food.stockCount : (food.isAvailable ? 40 : 0);
  const numPrice = Number(food.price) || 0;
  const isAvailable = food.isAvailable !== false && stock > 0 && numPrice > 0;
  return {
    id: food._id,
    name: food.name,
    category: food.category,
    station: food.station || 'Main Kitchen',
    description: food.description,
    price: numPrice,
    originalPrice: food.originalPrice,
    rating: food.rating || 4.8,
    reviewsCount: food.reviewsCount || 100,
    prepTime: food.preparationTime || '10 min',
    isVeg: food.isVeg,
    points: Math.floor(numPrice / 10),
    image: food.image,
    inStock: isAvailable,
    stockCount: Math.max(0, stock),
    isPopular: food.isPopular,
    isChefSpecial: food.isChefSpecial
  };
};

export const mapBackendOrderToKitchenTicket = (order: BackendOrder): KitchenTicket => {
  let status: 'new' | 'preparing' | 'ready' | 'completed' = 'new';
  if (order.orderStatus === 'Preparing') status = 'preparing';
  else if (order.orderStatus === 'Ready') status = 'ready';
  else if (order.orderStatus === 'Completed') status = 'completed';

  const customerName =
    typeof order.userId === 'object' && (order.userId as any)?.name
      ? (order.userId as any).name
      : (order.customerName || 'Campus Student');

  return {
    id: order._id,
    orderNumber: order.orderNumber,
    tokenNumber: order.tokenNumber,
    customerName,
    status,
    station: order.items[0]?.stationTag || 'Counter #01',
    items: order.items.map(i => ({
      name: `${i.quantity}x ${i.name}`,
      quantity: i.quantity,
      stationTag: i.stationTag || 'Kitchen'
    })),
    totalAmount: order.total,
    paymentMethod: order.paymentMethod,
    isPlusPriority: (order.subscriptionDiscount || 0) > 0,
    note: order.discount > 0 ? `Savings: ₹${order.discount}` : undefined,
    createdAt: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    etaMinutes: order.etaMinutes ?? (status === 'preparing' ? 6 : status === 'ready' ? 0 : 10)
  };
};

interface AdminKitchenContextType {
  tickets: KitchenTicket[];
  menuItems: MenuItem[];
  rawFoods: BackendFood[];
  rawOrders: BackendOrder[];
  isChimeActive: boolean;
  isOnlineOrdersPaused: boolean;
  isLoadingMenu: boolean;
  isLoadingOrders: boolean;
  fetchMenu: () => Promise<void>;
  fetchTickets: () => Promise<void>;
  acceptOrder: (ticketId: string) => Promise<void>;
  markOrderReady: (ticketId: string) => Promise<void>;
  completeHandover: (ticketId: string) => Promise<void>;
  toggleItemStatus: (itemId: string) => Promise<void>;
  updateItemStock: (itemId: string, newStock: number) => Promise<void>;
  restockItem: (itemId: string, addQuantity: number) => Promise<void>;
  editItemPrice: (itemId: string, newPrice: number) => Promise<void>;
  createFoodItem: (data: Partial<BackendFood>) => Promise<void>;
  deleteFoodItem: (itemId: string) => Promise<void>;
  toggleEmergencyPause: () => void;
  toggleChime: () => void;
}

const AdminKitchenContext = createContext<AdminKitchenContextType | undefined>(undefined);

export const AdminKitchenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, isAuthenticated } = useStudent();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [rawFoods, setRawFoods] = useState<BackendFood[]>([]);
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [rawOrders, setRawOrders] = useState<BackendOrder[]>([]);
  
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [isChimeActive, setIsChimeActive] = useState<boolean>(true);
  const [isOnlineOrdersPaused, setIsOnlineOrdersPaused] = useState<boolean>(false);

  // Fetch foods from MongoDB
  const fetchMenu = useCallback(async () => {
    try {
      const res = await foodApi.getFoods();
      if (res && res.foods) {
        setRawFoods(res.foods);
        setMenuItems(res.foods.map(mapBackendFoodToMenuItem));
      }
    } catch (err) {
      console.error('Failed to load menu items:', err);
    } finally {
      setIsLoadingMenu(false);
    }
  }, []);

  // Fetch orders from MongoDB (Only when authenticated as admin)
  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) {
      setTickets([]);
      setRawOrders([]);
      setIsLoadingOrders(false);
      return;
    }

    try {
      const res = await orderApi.getOrders();
      if (res && res.orders) {
        setRawOrders(res.orders);
        setTickets(res.orders.map(mapBackendOrderToKitchenTicket));
      }
    } catch (err) {
      console.error('Failed to load kitchen tickets:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [isAuthenticated, isAdmin]);

  // Initial load
  useEffect(() => {
    fetchMenu();
    fetchTickets();
  }, [fetchMenu, fetchTickets]);

  // Real-time student & admin menu sync every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchMenu();
    }, 3000);
    return () => clearInterval(timer);
  }, [fetchMenu]);

  // Live polling for tickets every 4 seconds only if authenticated admin
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    const timer = setInterval(() => {
      fetchTickets();
    }, 4000);
    return () => clearInterval(timer);
  }, [isAuthenticated, isAdmin, fetchTickets]);

  // Order status actions
  const acceptOrder = async (ticketId: string) => {
    try {
      await orderApi.updateOrderStatus(ticketId, 'Preparing');
      await fetchTickets();
    } catch (err) {
      console.error('Failed to accept order:', err);
    }
  };

  const markOrderReady = async (ticketId: string) => {
    try {
      await orderApi.updateOrderStatus(ticketId, 'Ready');
      await fetchTickets();
    } catch (err) {
      console.error('Failed to mark order ready:', err);
    }
  };

  const completeHandover = async (ticketId: string) => {
    try {
      await orderApi.updateOrderStatus(ticketId, 'Completed');
      await fetchTickets();
    } catch (err) {
      console.error('Failed to complete order handover:', err);
    }
  };

  // Food management actions
  const toggleItemStatus = async (itemId: string) => {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;
    const newInStock = !item.inStock;
    const newStock = newInStock ? ((item.stockCount && item.stockCount > 0) ? item.stockCount : 20) : 0;

    // Optimistic update
    setMenuItems(prev =>
      prev.map(i => (i.id === itemId ? { ...i, inStock: newInStock, stockCount: newStock } : i))
    );

    try {
      await foodApi.updateFood(itemId, { isAvailable: newInStock, stockCount: newStock });
      await fetchMenu();
    } catch (err) {
      console.error('Failed to toggle food stock status:', err);
      fetchMenu();
    }
  };

  const updateItemStock = async (itemId: string, newStock: number) => {
    const validStock = Math.max(0, Math.floor(newStock));
    const isAvailable = validStock > 0;

    // Optimistic update
    setMenuItems(prev =>
      prev.map(i => (i.id === itemId ? { ...i, inStock: isAvailable, stockCount: validStock } : i))
    );

    try {
      await foodApi.updateFood(itemId, { stockCount: validStock, isAvailable });
      await fetchMenu();
    } catch (err) {
      console.error('Failed to update food stock:', err);
      fetchMenu();
    }
  };

  const restockItem = async (itemId: string, addQuantity: number) => {
    const item = menuItems.find(i => i.id === itemId);
    const currentStock = item ? (item.stockCount ?? 0) : 0;
    const newStock = Math.max(0, currentStock + addQuantity);
    const isAvailable = newStock > 0;

    // Optimistic update
    setMenuItems(prev =>
      prev.map(i => (i.id === itemId ? { ...i, inStock: isAvailable, stockCount: newStock } : i))
    );

    try {
      await foodApi.updateFood(itemId, { stockDelta: addQuantity, isAvailable });
      await fetchMenu();
    } catch (err) {
      console.error('Failed to restock food item:', err);
      fetchMenu();
    }
  };

  const editItemPrice = async (itemId: string, newPrice: number) => {
    // Optimistic update
    setMenuItems(prev =>
      prev.map(i => (i.id === itemId ? { ...i, price: newPrice } : i))
    );

    try {
      await foodApi.updateFood(itemId, { price: newPrice });
      await fetchMenu();
    } catch (err) {
      console.error('Failed to update food price:', err);
      fetchMenu();
    }
  };

  const createFoodItem = async (data: Partial<BackendFood>) => {
    try {
      await foodApi.createFood(data);
      await fetchMenu();
    } catch (err) {
      console.error('Failed to create food item:', err);
      throw err;
    }
  };

  const deleteFoodItem = async (itemId: string) => {
    try {
      await foodApi.deleteFood(itemId);
      await fetchMenu();
    } catch (err) {
      console.error('Failed to delete food item:', err);
      throw err;
    }
  };

  const toggleEmergencyPause = () => {
    setIsOnlineOrdersPaused(prev => !prev);
  };

  const toggleChime = () => {
    setIsChimeActive(prev => !prev);
  };

  return (
    <AdminKitchenContext.Provider
      value={{
        tickets,
        menuItems,
        rawFoods,
        rawOrders,
        isChimeActive,
        isOnlineOrdersPaused,
        isLoadingMenu,
        isLoadingOrders,
        fetchMenu,
        fetchTickets,
        acceptOrder,
        markOrderReady,
        completeHandover,
        toggleItemStatus,
        updateItemStock,
        restockItem,
        editItemPrice,
        createFoodItem,
        deleteFoodItem,
        toggleEmergencyPause,
        toggleChime
      }}
    >
      {children}
    </AdminKitchenContext.Provider>
  );
};

export const useAdminKitchen = () => {
  const context = useContext(AdminKitchenContext);
  if (!context) {
    throw new Error('useAdminKitchen must be used within an AdminKitchenProvider');
  }
  return context;
};
