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
  plusDiscountLabel: string;
  milestoneDiscount: number;
  milestoneTitle: string | null;
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

  // Calculate current date in Asia/Kolkata (IST)
  const todayIST = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }, []);

  // Dining Club Plan detection and subscription discount calculation
  const subscriptionDetails = useMemo(() => {
    const sub = user?.subscription;
    if (!student.isPlusMember || !sub?.isActive) {
      return { isEligible: false, discount: 0, label: '', percent: 0, isWeekly: false, planType: null };
    }

    // Expiry check
    if (sub.endDate && new Date(sub.endDate) <= new Date()) {
      return { isEligible: false, discount: 0, label: '', percent: 0, isWeekly: false, planType: null };
    }

    const planType = (sub.planType || '').toLowerCase();
    const planName = (sub.plan || '').toLowerCase();

    const isWeekly = planType === 'weekly' || planName.includes('weekly') || planName.includes('snack');
    const is3Month =
      planType === '3-month' ||
      planType === 'semester' ||
      planName.includes('3-month') ||
      planName.includes('three') ||
      planName.includes('semester');
    const isMonthly = !isWeekly && !is3Month;

    const minOrder = isWeekly ? 31 : 41;
    const maxUses = isWeekly ? 7 : isMonthly ? 8 : 20;

    // Checks:
    // 1. Order meets minimum threshold
    if (subtotal < minOrder) {
      return { isEligible: false, discount: 0, label: '', percent: 0, isWeekly, planType: isWeekly ? 'weekly' : isMonthly ? 'monthly' : '3-month' };
    }

    // 2. Daily Limit: 1 subscription-discounted order per calendar day (IST)
    if (sub.lastSubscriptionDiscountDate === todayIST) {
      return { isEligible: false, discount: 0, label: '', percent: 0, isWeekly, planType: isWeekly ? 'weekly' : isMonthly ? 'monthly' : '3-month' };
    }

    // 3. Max subscription-discounted orders
    if ((sub.subscriptionUsageCount || 0) >= maxUses) {
      return { isEligible: false, discount: 0, label: '', percent: 0, isWeekly, planType: isWeekly ? 'weekly' : isMonthly ? 'monthly' : '3-month' };
    }

    // Calculate discount
    if (isWeekly) {
      // Flat ₹10 OFF
      const discount = Math.min(10, subtotal);
      return { isEligible: true, discount, label: 'Dining Club Member Discount (Flat ₹10 OFF)', percent: 0, isWeekly: true, planType: 'weekly' };
    } else {
      // Monthly & 3-Month: 15% OFF up to ₹20
      const calculated = Math.round(subtotal * 0.15);
      const discount = Math.min(calculated, 20);
      return { isEligible: true, discount, label: 'Dining Club Member Discount (15% OFF up to ₹20)', percent: 15, isWeekly: false, planType: is3Month ? '3-month' : 'monthly' };
    }
  }, [subtotal, student.isPlusMember, user?.subscription, todayIST]);

  const plusDiscount = subscriptionDetails.discount;
  const plusDiscountPercentage = subscriptionDetails.percent;
  const plusDiscountLabel = subscriptionDetails.label || 'Dining Club Member Discount';

  // Milestone bonus coupon detection on qualifying order
  const milestoneDetails = useMemo(() => {
    const sub = user?.subscription;
    if (!student.isPlusMember || !sub?.isActive) return { discount: 0, title: null };
    if (sub.endDate && new Date(sub.endDate) <= new Date()) return { discount: 0, title: null };

    const planType = (sub.planType || '').toLowerCase();
    const planName = (sub.plan || '').toLowerCase();

    const isWeekly = planType === 'weekly' || planName.includes('weekly') || planName.includes('snack');
    if (isWeekly) return { discount: 0, title: null };

    const is3Month =
      planType === '3-month' ||
      planType === 'semester' ||
      planName.includes('3-month') ||
      planName.includes('three') ||
      planName.includes('semester');
    const isMonthly = !isWeekly && !is3Month;

    const minOrder = 41;
    if (subtotal < minOrder) return { discount: 0, title: null };

    const nextOrderNumber = (sub.eligibleOrderCount || 0) + 1;
    const awarded = sub.milestonesAwarded || [];

    if (isMonthly) {
      if (nextOrderNumber === 15 && !awarded.includes(15)) {
        return { discount: 10, title: '15th Order Milestone Reward (₹10 Bonus Coupon)' };
      }
      if (nextOrderNumber === 24 && !awarded.includes(24)) {
        return { discount: 10, title: '24th Order Milestone Reward (₹10 Bonus Coupon)' };
      }
    } else if (is3Month) {
      if (nextOrderNumber === 25 && !awarded.includes(25)) {
        return { discount: 5, title: '25th Order Milestone Reward (₹5 Bonus Coupon)' };
      }
      if (nextOrderNumber === 28 && !awarded.includes(28)) {
        return { discount: 5, title: '28th Order Milestone Reward (₹5 Bonus Coupon)' };
      }
      if (nextOrderNumber === 35 && !awarded.includes(35)) {
        return { discount: 10, title: '35th Order Milestone Reward (₹10 Bonus Coupon)' };
      }
      if (nextOrderNumber === 40 && !awarded.includes(40)) {
        return { discount: 8, title: '40th Order Milestone Reward (₹8 Bonus Coupon)' };
      }
    }

    return { discount: 0, title: null };
  }, [subtotal, student.isPlusMember, user?.subscription]);

  const milestoneDiscount = milestoneDetails.discount;
  const milestoneTitle = milestoneDetails.title;


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
    const raw = subtotal - plusDiscount - milestoneDiscount - couponDiscount + packagingFee;
    return Math.max(0, raw);
  }, [subtotal, plusDiscount, milestoneDiscount, couponDiscount, packagingFee]);

  // ₹10 spent = 1 point earned, with 1.5x Dining Club multiplier after milestone orders
  const earnedPoints = useMemo(() => {
    const sub = user?.subscription;
    let multiplier = 1.0;
    if (student.isPlusMember && sub?.isActive) {
      const planType = (sub.planType || '').toLowerCase();
      const planName = (sub.plan || '').toLowerCase();
      const is3Month =
        planType === '3-month' ||
        planType === 'semester' ||
        planName.includes('3-month') ||
        planName.includes('three') ||
        planName.includes('semester');
      const isMonthly = !is3Month && (planType === 'monthly' || planName.includes('monthly') || planName.includes('plus'));

      if (isMonthly && (sub.eligibleOrderCount || 0) >= 15) {
        multiplier = 1.5;
      } else if (is3Month && (sub.eligibleOrderCount || 0) >= 21) {
        multiplier = 1.5;
      }
    }
    const basePoints = total / 10;
    return Math.floor(basePoints * multiplier);
  }, [total, student.isPlusMember, user?.subscription]);

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
        plusDiscountLabel,
        milestoneDiscount,
        milestoneTitle,
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
