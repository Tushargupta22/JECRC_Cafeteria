import React, { useState } from 'react';
import { MenuItem } from '../../data/mockData';
import { useCart } from '../../context/CartContext';

interface FoodCardProps {
  item: MenuItem;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item }) => {
  const { items, addToCart, updateQuantity } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);

  const cartItem = items.find(i => i.item.id === item.id);
  const quantityInCart = cartItem?.quantity || 0;

  return (
    <article className="group relative flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] hover:shadow-[0_12px_32px_-4px_rgba(15,23,42,0.08),0_4px_12px_-2px_rgba(255,94,58,0.08)] transition-all duration-300 border border-surface-container/50">
      {/* Media Area */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-surface-container">
        <img
          src={item.image}
          alt={item.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
            !item.inStock ? 'grayscale opacity-75' : ''
          }`}
        />

        {/* Dietary / Category Badge */}
        <div className="absolute top-space-xs left-space-xs px-2.5 py-1 rounded-full bg-[#ECFDF5]/90 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
          <span className="font-label-sm text-label-sm text-[#065F46] font-bold">
            {['Cold Beverages', 'Ice With Milk Shakes', 'Coffee & Tea'].includes(item.category)
              ? 'BEVERAGE'
              : item.category === 'Products on MRP'
              ? 'MRP ITEM'
              : '100% VEG'}
          </span>
        </div>

        {/* Prep Time Pill */}
        <div className="absolute top-space-xs right-space-xs px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md flex items-center gap-1 shadow-sm font-label-sm text-label-sm text-on-surface">
          <span className="material-symbols-outlined text-xs text-primary">timer</span>
          <span>{item.prepTime}</span>
        </div>

        {/* Favorite Toggle Button */}
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="absolute bottom-space-xs right-space-xs w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-center shadow-sm transition-transform active:scale-90"
        >
          <span
            className={`material-symbols-outlined text-lg ${
              isFavorite ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
            }`}
            style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
        </button>

        {/* Out of stock overlay */}
        {!item.inStock && (
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-space-sm py-1 rounded-full bg-error text-on-error font-label-md text-label-md font-bold shadow-lg uppercase tracking-wider">
              86'd Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Card Content Details */}
      <div className="flex flex-col flex-1 p-space-md justify-between">
        <div>
          <div className="flex items-center justify-between gap-space-xs mb-1">
            <h3 className="font-title-lg text-title-lg text-on-surface group-hover:text-primary transition-colors">
              {item.name}
            </h3>
            <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-label-sm text-label-sm flex-shrink-0">
              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              <span className="font-bold">{item.rating}</span>
              <span className="text-on-surface-variant font-normal">({item.reviewsCount})</span>
            </div>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mb-space-sm">
            {item.description}
          </p>
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between pt-space-xs mt-auto">
          <div className="flex flex-col">
            {item.originalPrice ? (
              <span className="font-label-sm text-label-sm text-on-surface-variant line-through">
                ₹{item.originalPrice}
              </span>
            ) : (
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Standard Portion
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {item.price > 0 ? `₹${item.price}` : item.category === 'Products on MRP' ? 'At MRP' : 'MRP / Pending'}
              </span>
              {item.originalPrice && (
                <span className="font-label-sm text-label-sm text-secondary font-semibold">
                  {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% off
                </span>
              )}
            </div>
          </div>

          {/* Stepper or Add Button */}
          {!item.inStock ? (
            <span className="font-label-sm text-label-sm text-error font-semibold">Unavailable</span>
          ) : quantityInCart > 0 ? (
            <div className="flex items-center bg-surface-container-high rounded-full p-1 shadow-inner">
              <button
                onClick={() => updateQuantity(item.id, -1)}
                className="w-7 h-7 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface hover:bg-surface-variant active:scale-95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              <span className="font-label-md text-label-md text-on-surface px-2.5 font-bold">
                {quantityInCart}
              </span>
              <button
                onClick={() => updateQuantity(item.id, 1)}
                className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(item, 1)}
              className="flex items-center gap-1 px-space-sm py-2 rounded-full bg-surface-container-high hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md text-label-md transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
