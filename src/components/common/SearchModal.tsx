import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminKitchen } from '../../context/AdminKitchenContext';
import { useCart } from '../../context/CartContext';
import { MenuItem } from '../../data/mockData';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const { menuItems } = useAdminKitchen();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggling
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase()) ||
    item.station.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectItem = (item: MenuItem) => {
    addToCart(item, 1);
    onClose();
    navigate('/menu');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-on-surface/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden border border-surface-container">
        {/* Search Input Bar */}
        <div className="flex items-center px-space-md py-space-sm border-b border-surface-container gap-space-sm">
          <span className="material-symbols-outlined text-2xl text-outline">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search burgers, cold coffees, bowls, counters..."
            className="flex-1 bg-transparent border-none outline-none font-body-lg text-on-surface placeholder:text-on-surface-variant text-body-lg"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-space-sm divide-y divide-surface-container/60">
          {filteredItems.length === 0 ? (
            <div className="p-space-lg text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">lunch_dining</span>
              <p className="font-title-md text-title-md">No items found matching "{query}"</p>
              <p className="font-body-sm text-body-sm mt-1">Try searching for "burger", "coffee", or "fries"</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-space-sm rounded-2xl hover:bg-surface-container-low transition-colors group cursor-pointer"
                onClick={() => handleSelectItem(item)}
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-space-xs">
                      <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-secondary' : 'bg-error'}`} />
                      <h4 className="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors truncate">
                        {item.name}
                      </h4>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {item.station} • {item.prepTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-space-sm flex-shrink-0">
                  <div className="text-right">
                    <div className="font-title-lg text-title-lg text-primary font-bold">₹{item.price}</div>
                    <span className="font-label-sm text-label-sm text-secondary font-semibold">🪙 +{item.points} pts</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectItem(item);
                    }}
                    className="px-space-sm py-1.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold shadow-sm hover:opacity-90 flex items-center gap-1"
                  >
                    <span>Add</span>
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-space-md py-space-xs bg-surface-container-low flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface font-mono">ESC</kbd>
            <span>to close</span>
          </div>
          <span className="text-primary font-bold">JECRC Cafeteria Instant Menu Search</span>
        </div>
      </div>
    </div>
  );
};
