import React, { useState } from 'react';
import { useAdminKitchen } from '../context/AdminKitchenContext';

export const AdminInventory: React.FC = () => {
  const { menuItems, toggleItemStatus, editItemPrice, updateItemStock } = useAdminKitchen();
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState('');

  const stations = ['All', 'The Campus Grill', 'North Hall Brew Station', 'Fries & Dips Kiosk', 'Campus Thali & Bowls', 'Beverage Bar', 'Bakery & Deli', 'Green Salad Bar'];

  const filtered = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                          item.station.toLowerCase().includes(search.toLowerCase());
    const matchesStation = selectedStation === 'All' || item.station === selectedStation;
    return matchesSearch && matchesStation;
  });

  const handleSavePrice = (id: string) => {
    const p = parseInt(editPrice);
    if (!isNaN(p) && p > 0) {
      editItemPrice(id, p);
    }
    setEditingId(null);
  };

  const handleSaveStock = (id: string) => {
    const s = parseInt(editStockValue, 10);
    if (!isNaN(s)) {
      updateItemStock(id, Math.max(0, s));
    }
    setEditingStockId(null);
    setEditStockValue('');
  };

  return (
    <div className="flex flex-col w-full py-space-md space-y-space-lg">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
            Stock &amp; Stations Inventory
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Manage live 86 items, update dish pricing, and track kitchen prep stations across campus.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md font-bold">
            {menuItems.filter(i => i.inStock).length} Available
          </span>
          <span className="px-space-sm py-1 rounded-full bg-error-container text-on-error-container font-label-md text-label-md font-bold">
            {menuItems.filter(i => !i.inStock).length} 86'd
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md border border-surface-container/60">
        <div className="flex items-center bg-surface-container-low px-space-md py-2 rounded-xl flex-1 max-w-md">
          <span className="material-symbols-outlined text-outline mr-2">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, ingredients, stations..."
            className="bg-transparent border-none outline-none font-body-md text-on-surface w-full"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {stations.slice(0, 5).map(st => (
            <button
              key={st}
              onClick={() => setSelectedStation(st)}
              className={`px-space-sm py-1.5 rounded-xl font-label-sm text-label-sm font-semibold whitespace-nowrap cursor-pointer ${
                selectedStation === st
                  ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-surface-container-lowest rounded-3xl shadow-sm overflow-hidden border border-surface-container/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-body-sm text-body-sm">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-container text-on-surface-variant font-label-sm text-label-sm uppercase">
                <th className="py-space-sm px-space-md">Item</th>
                <th className="py-space-sm px-space-md">Station</th>
                <th className="py-space-sm px-space-md">Category</th>
                <th className="py-space-sm px-space-md">Price</th>
                <th className="py-space-sm px-space-md">Status</th>
                <th className="py-space-sm px-space-md text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-space-sm px-space-md">
                    <div className="flex items-center gap-space-sm">
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`w-12 h-12 rounded-xl object-cover flex-shrink-0 ${
                          !item.inStock ? 'grayscale opacity-75' : ''
                        }`}
                      />
                      <div>
                        <span className="font-title-md text-title-md text-on-surface font-bold block">
                          {item.name}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                          {item.prepTime} prep • ⭐ {item.rating}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-space-sm px-space-md text-on-surface font-medium">{item.station}</td>
                  <td className="py-space-sm px-space-md">
                    <span className="px-2.5 py-1 rounded-full bg-surface-container font-label-sm text-label-sm">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-space-sm px-space-md">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-20 px-2 py-1 rounded border text-sm"
                        />
                        <button
                          onClick={() => handleSavePrice(item.id)}
                          className="px-2 py-1 rounded bg-primary-container text-on-primary text-xs font-bold"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <span className="font-headline-sm text-headline-sm text-on-surface font-black">
                        ₹{item.price}
                      </span>
                    )}
                  </td>
                  <td className="py-space-sm px-space-md">
                    {item.inStock && (item.stockCount ?? 0) > 0 ? (
                      (item.stockCount ?? 0) <= 10 ? (
                        <span className="px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold inline-flex items-center gap-1 bg-amber-100 text-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                          Low Stock ({item.stockCount})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                          In Stock ({item.stockCount})
                        </span>
                      )
                    ) : (
                      <span className="px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold inline-flex items-center gap-1 bg-error-container text-on-error-container">
                        <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                        86'd Out of Stock
                      </span>
                    )}
                  </td>
                  <td className="py-space-sm px-space-md text-right">
                    {editingStockId === item.id ? (
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setEditStockValue(prev => Math.max(0, (parseInt(prev, 10) || 0) - 1).toString())}
                          className="w-6 h-6 rounded bg-surface-container font-bold text-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={editStockValue}
                          onChange={(e) => setEditStockValue(e.target.value)}
                          className="w-14 px-1 py-0.5 rounded border text-xs text-center font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => setEditStockValue(prev => ((parseInt(prev, 10) || 0) + 1).toString())}
                          className="w-6 h-6 rounded bg-surface-container font-bold text-xs"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditStockValue(prev => ((parseInt(prev, 10) || 0) + 20).toString())}
                          className="px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container text-xs font-bold"
                          title="Restock +20"
                        >
                          +20
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditStockValue('0')}
                          className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container text-xs font-bold"
                          title="Set Out of Stock"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveStock(item.id)}
                          className="px-2 py-0.5 rounded bg-primary-container text-on-primary text-xs font-bold"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStockId(null)}
                          className="px-1.5 py-0.5 rounded bg-surface-container text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingStockId(item.id);
                            setEditStockValue((item.stockCount ?? 0).toString());
                            setEditingId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold"
                          title="Edit stock"
                        >
                          Stock: {item.stockCount}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(item.id);
                            setEditPrice(item.price.toString());
                            setEditingStockId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold"
                        >
                          Price
                        </button>
                        <button
                          onClick={() => toggleItemStatus(item.id)}
                          className={`px-3 py-1 rounded-lg font-label-sm text-label-sm font-bold cursor-pointer ${
                            item.inStock
                              ? 'bg-error-container text-on-error-container hover:bg-error hover:text-on-error'
                              : 'bg-secondary-container text-on-secondary-fixed-variant hover:bg-secondary hover:text-on-secondary'
                          }`}
                        >
                          {item.inStock ? 'Disable 86' : 'Enable'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
