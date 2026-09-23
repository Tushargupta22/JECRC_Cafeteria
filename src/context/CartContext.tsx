import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { MenuItem } from '../data/mockData';
import { useStudent } from './StudentContext';
import { offerApi, BackendOffer } from '../services/api';

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  plusDiscount: number;
  plusDiscountPercentage: number;
  couponDiscount: number;
  packagingFee: number;
  total: number;
  earnedPoints: number;
  appliedCoupon: string | null;
  couponErrorMessage: string | null;
  availableOffers: BackendOffer[];
  isCartDrawerOpen: boolean;
  addToCart: (item: MenuItem, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  setIsCartDrawerOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'cafetarea_cart_items';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { student, user } = useStudent();
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [serverCouponDiscount, setServerCouponDiscount] = useState<number>(0);
  const [couponErrorMessage, setCouponErrorMessage] = useState<string | null>(null);
  const [availableOffers, setAvailableOffers] = useState<BackendOffer[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);

  // Sync to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore
    }
  }, [items]);

  // Load offers from backend
  useEffect(() => {
    offerApi
      .getOffers()
      .then((res) => {
        if (res && res.offers) {
          setAvailableOffers(res.offers);
        }
      })
      .catch(() => {
        // Ignore
      });
  }, []);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.item.price * item.quantity, 0);
  }, [items]);

  // Plus Member discount - use actual subscription discount percentage from user data
  const plusDiscount = useMemo(() => {
    if (!student.isPlusMember || !user?.subscription?.isActive) return 0;
    const discountPercent = user.subscription.discountPercentage || 10;
    return Math.round(subtotal * (discountPercent / 100));
  }, [subtotal, student.isPlusMember, user?.subscription?.isActive, user?.subscription?.discountPercentage]);

  // Get actual discount percentage for display (used by CartTray)
  const plusDiscountPercentage = useMemo(() => {
    if (!student.isPlusMember || !user?.subscription?.isActive) return 0;
    return user.subscription.discountPercentage || 10;
  }, [student.isPlusMember, user?.subscription?.isActive, user?.subscription?.discountPercentage]);

  // Re-validate applied coupon with backend whenever subtotal or items change
  useEffect(() => {
    if (!appliedCoupon) {
      setServerCouponDiscount(0);
      return;
    }

    if (items.length === 0) {
      setServerCouponDiscount(0);
      return;
    }

    const payload = {
      couponCode: appliedCoupon,
      subtotal,
      items: items.map((ci) => ({
        foodId: ci.item.id,
        name: ci.item.name,
        price: ci.item.price,
        quantity: ci.quantity,
        category: ci.item.category,
        stationTag: ci.item.station
      }))
    };

    offerApi
      .validateCoupon(payload)
      .then((res) => {
        if (res && res.valid) {
          setServerCouponDiscount(res.discountAmount);
          setCouponErrorMessage(null);
        } else {
          // If items changed and no longer meet minimum order or eligibility
          setServerCouponDiscount(0);
          setCouponErrorMessage(res?.message || 'Coupon no longer applicable');
        }
      })
      .catch((err: any) => {
        setServerCouponDiscount(0);
        setCouponErrorMessage(err.message || 'Coupon validation failed');
      });
  }, [subtotal, items, appliedCoupon]);

  const couponDiscount = serverCouponDiscount;

  // Tech & packaging fee waived for Plus members, standard ₹0 for campus pickup
  const packagingFee = 0;

  const total = useMemo(() => {
    const raw = subtotal - plusDiscount - couponDiscount + packagingFee;
    return Math.max(0, raw);
  }, [subtotal, plusDiscount, couponDiscount, packagingFee]);

  // ₹10 spent = 1 point earned
  const earnedPoints = useMemo(() => {
    return Math.floor(total / 10);
  }, [total]);

  const addToCart = (item: MenuItem, quantity = 1) => {
    if (!item.inStock || item.price <= 0 || (item.stockCount !== undefined && item.stockCount <= 0)) {
      alert(`This item is currently unavailable for online ordering: "${item.name}"`);
      return;
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        const availableStock = item.stockCount ?? Infinity;
        if (existing.quantity + quantity > availableStock) {
          alert(`Only ${availableStock} left in stock for "${item.name}".`);
          return prev;
        }
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { item, quantity }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setItems((prev) => {
      return prev
        .map((i) => {
          if (i.item.id === itemId) {
            if (delta > 0) {
              const availableStock = i.item.stockCount ?? Infinity;
              if (i.quantity + delta > availableStock) {
                alert(`Only ${availableStock} left in stock for "${i.item.name}".`);
                return i;
              }
            }
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setServerCouponDiscount(0);
    setCouponErrorMessage(null);
  };

  /**
   * Apply coupon code through backend validation.
   * Client never determines the validity or final discount.
   */
  const applyCoupon = useCallback(
    async (code: string): Promise<boolean> => {
      if (!code || !code.trim()) {
        setCouponErrorMessage('Please enter a coupon code');
        return false;
      }

      const clean = code.trim().toUpperCase();

      try {
        const payload = {
          couponCode: clean,
          subtotal,
          items: items.map((ci) => ({
            foodId: ci.item.id,
            name: ci.item.name,
            price: ci.item.price,
            quantity: ci.quantity,
            category: ci.item.category,
            stationTag: ci.item.station
          }))
        };

        const res = await offerApi.validateCoupon(payload);

        if (res && res.valid) {
          setAppliedCoupon(res.couponCode);
          setServerCouponDiscount(res.discountAmount);
          setCouponErrorMessage(null);
          return true;
        } else {
          setCouponErrorMessage(res?.message || 'Invalid or ineligible coupon');
          return false;
        }
      } catch (err: any) {
        const msg = err.message || 'Coupon validation failed';
        setCouponErrorMessage(msg);
        return false;
      }
    },
    [subtotal, items]
  );

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setServerCouponDiscount(0);
    setCouponErrorMessage(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        plusDiscount,
        plusDiscountPercentage,
        couponDiscount,
        packagingFee,
        total,
        earnedPoints,
        appliedCoupon,
        couponErrorMessage,
        availableOffers,
        isCartDrawerOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        applyCoupon,
        removeCoupon,
        setIsCartDrawerOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
