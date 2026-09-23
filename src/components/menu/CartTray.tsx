import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useOrder } from '../../context/OrderContext';
import { useStudent } from '../../context/StudentContext';

interface CartTrayProps {
  isDrawer?: boolean;
  onClose?: () => void;
}

export const CartTray: React.FC<CartTrayProps> = ({ isDrawer, onClose }) => {
  const {
    items,
    itemCount,
    subtotal,
    plusDiscount,
    plusDiscountPercentage,
    couponDiscount,
    total,
    earnedPoints,
    appliedCoupon,
    couponErrorMessage,
    updateQuantity,
    clearCart,
    applyCoupon,
    removeCoupon
  } = useCart();

  const { createOrderFromCart } = useOrder();
  const { isAuthenticated, openAuthModal } = useStudent();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput) return;
    const success = await applyCoupon(couponInput);
    if (success) {
      setCouponError(false);
      setCouponInput('');
    } else {
      setCouponError(true);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    // Validate food IDs before checkout
    const hasInvalidIds = items.some(item => {
      const foodId = item.item?.id;
      return (
        !foodId ||
        typeof foodId !== 'string' ||
        foodId.includes('-') ||
        foodId.length < 20 ||
        !foodId.match(/^[0-9a-fA-F]{24}$/)
      );
    });

    if (hasInvalidIds) {
      const shouldRefresh = confirm(
        '⚠️ Your cart contains outdated menu items.\n\n' +
        'This happens when the page data is cached.\n\n' +
        'Please refresh the page (Ctrl+Shift+R) to reload the menu, then try again.\n\n' +
        'Click OK to refresh now, or Cancel to continue anyway (may fail).'
      );
      
      if (shouldRefresh) {
        window.location.reload();
        return;
      }
    }

    setIsProcessing(true);

    try {
      await createOrderFromCart(items, total, appliedCoupon || undefined);
      clearCart();
      if (onClose) onClose();
      navigate('/track-order');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create order on server. Please check your network and try again.';
      
      // If it's an ID format error, show refresh prompt
      if (errorMsg.includes('Invalid') || errorMsg.includes('refresh')) {
        alert(
          '❌ ' + errorMsg + '\n\n' +
          '💡 Solution: Press Ctrl+Shift+R to refresh the page and reload the menu.'
        );
      } else {
        alert(errorMsg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const content = (
    <div className="flex flex-col gap-space-md bg-surface-container-lowest shadow-[0_12px_32px_-4px_rgba(15,23,42,0.08)] p-space-lg border border-surface-container/60 rounded-3xl">
      {/* Tray Header */}
      <div className="flex justify-between items-center pb-space-xs">
        <div className="flex items-center gap-space-xs">
          <span className="text-primary text-2xl material-symbols-outlined">shopping_cart_checkout</span>
          <div>
            <h3 className="font-title-lg text-on-surface text-title-lg">Your Tray</h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in order
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-error underline transition-colors"
            >
              Clear
            </button>
          )}
          {isDrawer && (
            <button onClick={onClose} className="hover:bg-surface-container p-1 rounded-full">
              <span className="text-xl material-symbols-outlined">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Pickup Station Slot Card */}
      <div className="flex items-center gap-space-xs bg-surface-container-low p-space-xs rounded-xl">
        <div className="flex justify-center items-center bg-surface-container-highest rounded-lg w-9 h-9 text-on-surface shrink-0">
          <span className="text-lg material-symbols-outlined">storefront</span>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Pickup Destination:</span>
          <span className="font-title-md text-on-surface text-title-md truncate">
            Counter 2 • Approx 12:45 PM
          </span>
        </div>
        <span className="bg-secondary-container px-2 py-0.5 rounded-full font-label-sm font-bold text-label-sm text-on-secondary-container">
          Fast
        </span>
      </div>

      {/* Active Tray Items List */}
      <div className="flex flex-col gap-space-sm my-space-xs max-h-72 overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-space-lg text-on-surface-variant text-center">
            <span className="mb-1 text-outline text-3xl material-symbols-outlined">shopping_basket</span>
            <p className="font-body-md text-body-md">Your tray is empty</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant/80">Add delicious campus meals from the menu</p>
          </div>
        ) : (
          items.map(({ item, quantity }) => (
            <div
              key={item.id}
              className="flex justify-between items-center gap-space-xs bg-surface hover:bg-surface-container-low p-space-xs rounded-xl transition-colors"
            >
              <div className="flex items-center gap-space-xs min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${item.isVeg ? 'bg-secondary' : 'bg-error'}`} />
                <div className="flex flex-col min-w-0">
                  <span className="font-label-lg text-label-lg text-on-surface truncate">{item.name}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    ₹{item.price} × {quantity}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs shrink-0">
                <span className="font-title-md font-bold text-on-surface text-title-md">
                  ₹{item.price * quantity}
                </span>
                <div className="flex items-center bg-surface-container p-0.5 rounded-lg">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="flex justify-center items-center hover:bg-surface-container-highest rounded w-5 h-5 text-on-surface active:scale-95"
                  >
                    -
                  </button>
                  <span className="px-1.5 font-label-sm font-bold text-label-sm">{quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="flex justify-center items-center hover:bg-surface-container-highest rounded w-5 h-5 text-on-surface active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Applied Coupon Pill or Input */}
      {appliedCoupon ? (
        <div className="flex justify-between items-center bg-secondary-container/30 px-space-sm py-2 rounded-xl">
          <div className="flex items-center gap-space-2xs text-on-secondary-container">
            <span className="text-base material-symbols-outlined">verified</span>
            <span className="font-label-sm font-bold text-label-sm tracking-wide">{appliedCoupon}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm font-bold text-label-sm text-secondary">-₹{couponDiscount} Applied</span>
            <button
              onClick={removeCoupon}
              className="text-on-surface-variant hover:text-error text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleApplyCoupon} className="flex items-center gap-2">
          <input
            type="text"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            placeholder="Try: COFFEELOVER"
            className="flex-1 bg-surface-container-low px-3 py-1.5 border border-surface-container rounded-xl font-label-sm text-label-sm uppercase"
          />
          <button
            type="submit"
            className="bg-surface-container-highest hover:bg-surface-container px-3 py-1.5 rounded-xl font-label-sm font-bold text-label-sm text-on-surface"
          >
            Apply
          </button>
        </form>
      )}
      {couponError && (
        <span className="font-medium text-error text-xs">
          {couponErrorMessage || 'Invalid code. Try COFFEELOVER or JECRC50'}
        </span>
      )}

      {/* Price Calculation Breakdown */}
      <div className="flex flex-col gap-1.5 pt-space-xs font-body-sm text-body-sm">
        <div className="flex justify-between text-on-surface-variant">
          <span>Item Subtotal</span>
          <span className="font-semibold text-on-surface">₹{subtotal}</span>
        </div>
        <div className="flex justify-between text-secondary">
          <span className="flex items-center gap-1">
            <span>Cafeteria Plus Member Discount ({plusDiscountPercentage}%)</span>
            <span className="text-xs material-symbols-outlined">info</span>
          </span>
          <span className="font-semibold">-₹{plusDiscount}</span>
        </div>
        {couponDiscount > 0 && (
          <div className="flex justify-between text-secondary">
            <span>Promo Coupon Discount</span>
            <span className="font-semibold">-₹{couponDiscount}</span>
          </div>
        )}
        <div className="flex justify-between text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span>Campus Tech &amp; Packaging Fee</span>
            <span className="text-outline-variant line-through">₹15</span>
          </span>
          <span className="font-bold text-secondary">FREE (Plus Benefit)</span>
        </div>

        {/* Grand Total Bar */}
        <div className="flex justify-between items-baseline bg-surface-container-low mt-space-xs p-space-sm pt-space-xs rounded-xl">
          <div>
            <span className="font-headline-sm font-bold text-headline-sm text-on-surface">
              To Pay: ₹{total}
            </span>
            <div className="flex items-center gap-1 mt-0.5 font-label-sm font-bold text-label-sm text-secondary">
              <span className="text-sm material-symbols-outlined">savings</span>
              <span>You saved ₹{plusDiscount + couponDiscount + 15} on this meal!</span>
            </div>
          </div>
          <div className="text-right">
            <span className="bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-label-sm font-bold text-label-sm">
              🪙 +{earnedPoints} pts
            </span>
          </div>
        </div>
      </div>

      {/* Big Primary Checkout Action */}
      <button
        onClick={handleCheckout}
        disabled={items.length === 0 || isProcessing}
        className={`w-full h-14 rounded-full bg-primary-container hover:bg-primary text-on-primary font-headline-sm text-title-lg flex items-center justify-between px-space-lg shadow-[0_8px_20px_rgba(255,94,58,0.35)] hover:shadow-[0_12px_28px_rgba(255,94,58,0.45)] transition-all transform active:scale-95 group cursor-pointer ${
          items.length === 0 ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <div className="flex flex-col text-left">
          <span className="opacity-90 font-label-sm text-label-sm leading-tight">Total Payable</span>
          <span className="font-bold text-lg leading-tight">₹{total}.00</span>
        </div>
        <div className="flex items-center gap-1 font-bold">
          <span>{isProcessing ? 'Firing Order...' : 'Pay & Pickup'}</span>
          <span className="transition-transform group-hover:translate-x-1 material-symbols-outlined">
            arrow_forward
          </span>
        </div>
      </button>

      {/* Security & Razorpay Badge */}
      <div className="flex justify-center items-center gap-space-xs pt-1 font-label-sm text-label-sm text-on-surface-variant">
        <span className="text-secondary text-sm material-symbols-outlined">verified_user</span>
        <span>Secured with Razorpay Campus UPI &amp; Student ID Card</span>
      </div>
    </div>
  );

  if (isDrawer) {
    return (
      <div className="z-50 fixed inset-0 flex justify-end bg-on-surface/40 backdrop-blur-sm animate-in duration-200 fade-in">
        <div className="bg-surface shadow-2xl p-4 w-full max-w-md h-full overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
