import React, { useState } from 'react';
import { useAdminKitchen } from '../context/AdminKitchenContext';
import { FoodCard } from '../components/menu/FoodCard';
import { CartTray } from '../components/menu/CartTray';

export const Menu: React.FC = () => {
  const { menuItems, isLoadingMenu } = useAdminKitchen();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [vegOnly, setVegOnly] = useState<boolean>(false);
  const [bestsellerOnly, setBestsellerOnly] = useState<boolean>(false);
  const [underTenMinOnly, setUnderTenMinOnly] = useState<boolean>(false);
  const [plusDealsOnly, setPlusDealsOnly] = useState<boolean>(false);

  const categories = [
    { name: 'All Items', icon: '' },
    { name: 'Bread Station Sandwich', icon: '🥪' },
    { name: 'Burger', icon: '🍔' },
    { name: 'Pizza', icon: '🍕' },
    { name: 'Pasta', icon: '🍝' },
    { name: 'Chin se Chinese', icon: '🥢' },
    { name: 'Rolls', icon: '🌯' },
    { name: 'Maggi Delight', icon: '🍜' },
    { name: 'Fryday', icon: '🍟' },
    { name: 'Ice With Milk Shakes', icon: '🥤' },
    { name: 'Coffee & Tea', icon: '☕' },
    { name: 'Products on MRP', icon: '🏷️' },
    { name: 'Meals & Thalis', icon: '🍱' },
    { name: 'Healthy & Greens', icon: '🥗' },
    { name: 'Breakfast', icon: '🍳' },
    { name: 'Snacks & Sides', icon: '🍿' }
  ].filter(cat => {
    if (cat.name === 'All Items') return true;
    const count = menuItems.filter(item =>
      item.category.toLowerCase() === cat.name.toLowerCase() ||
      item.category.toLowerCase().includes(cat.name.toLowerCase()) ||
      cat.name.toLowerCase().includes(item.category.toLowerCase())
    ).length;
    return count > 0 || [
      'Bread Station Sandwich', 'Burger', 'Pizza', 'Pasta',
      'Chin se Chinese', 'Rolls', 'Maggi Delight', 'Fryday',
      'Ice With Milk Shakes', 'Coffee & Tea', 'Products on MRP'
    ].includes(cat.name);
  });

  const getCategoryCount = (categoryName: string) => {
    if (categoryName === 'All Items') return menuItems.length;
    return menuItems.filter(item =>
      item.category.toLowerCase() === categoryName.toLowerCase() ||
      item.category.toLowerCase().includes(categoryName.toLowerCase()) ||
      categoryName.toLowerCase().includes(item.category.toLowerCase())
    ).length;
  };

  const filteredItems = menuItems.filter(item => {
    // Search filter
    if (searchQuery.trim()) {
      const match = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.station.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!match) return false;
    }

    // Category filter
    if (selectedCategory !== 'All Items') {
      const catMatch = item.category.toLowerCase() === selectedCategory.toLowerCase() ||
                        item.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
                        selectedCategory.toLowerCase().includes(item.category.toLowerCase());
      if (!catMatch) return false;
    }

    // Quick filters
    if (vegOnly && !item.isVeg) return false;
    if (bestsellerOnly && !item.isPopular) return false;
    if (underTenMinOnly) {
      const minutes = parseInt(item.prepTime) || 15;
      if (minutes > 10) return false;
    }
    if (plusDealsOnly && !item.originalPrice) return false;

    return true;
  });

  return (
    <div className="w-full bg-surface min-h-screen">
      {/* Subtle Ambient Glow Orbs behind main content */}
      <div className="relative w-full max-w-container-max mx-auto px-gutter-desktop py-space-lg">
        <div className="absolute -top-16 left-1/4 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute top-96 right-10 w-80 h-80 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none -z-10"></div>

        {/* Top Command & Filter Deck */}
        <section className="flex flex-col gap-space-md mb-space-xl">
          {/* Search and Express Banner */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
            {/* Search Input with focus-ring styling */}
            <div className="relative flex-1 max-w-2xl">
              <div className="flex items-center w-full h-[52px] bg-surface-container-lowest rounded-full shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] px-space-md transition-all focus-within:shadow-[0_4px_24px_rgba(255,94,58,0.2)] border border-surface-container/60">
                <span className="material-symbols-outlined text-outline text-2xl mr-space-xs">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search delicious burgers, cold brew beverages, protein thalis..."
                  className="w-full bg-transparent border-none outline-none font-body-md text-on-surface placeholder:text-on-surface-variant/70 text-body-md"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-full text-on-surface-variant hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                )}
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors ml-1"
                  title="Voice Search"
                >
                  <span className="material-symbols-outlined text-xl">mic</span>
                </button>
                <span className="text-outline-variant mx-1">|</span>
                <button
                  onClick={() => setVegOnly(!vegOnly)}
                  className="flex items-center gap-1 px-space-xs py-1 rounded-full text-primary font-label-sm text-label-sm hover:bg-surface-container-low transition-colors font-bold"
                >
                  <span className="material-symbols-outlined text-sm">tune</span>
                  <span className="hidden sm:inline">Filters</span>
                </button>
              </div>
            </div>

            {/* Quick Status Pills / Express Pickup Banner */}
            <div className="flex items-center gap-space-xs flex-wrap">
              <div className="flex items-center gap-space-xs px-space-sm py-2 rounded-full bg-surface-container-lowest shadow-sm border border-surface-container/60">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></span>
                <span className="font-label-sm text-label-sm text-on-surface">Kitchen Status:</span>
                <span className="font-label-md text-label-md text-secondary font-bold">Optimal (Queue: ~7m)</span>
              </div>
              <div className="flex items-center gap-space-xs px-space-sm py-2 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm shadow-sm font-bold">
                <span className="material-symbols-outlined text-sm">bolt</span>
                <span>Express Pass Active</span>
              </div>
            </div>
          </div>

          {/* Station & Category Pills */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-1 no-scrollbar text-nowrap">
            {categories.map(cat => {
              const active = selectedCategory === cat.name;
              const count = getCategoryCount(cat.name);
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-space-md py-2 rounded-full font-label-md text-label-md transition-all transform active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-on-surface text-surface-container-lowest font-bold shadow-md'
                      : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface shadow-sm'
                  }`}
                >
                  <span>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</span>
                  <span className={`text-label-sm px-1.5 py-0.5 rounded-full ${
                    active
                      ? 'bg-surface-container-lowest/25 text-surface-container-lowest'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Toggles Toolbar */}
          <div className="flex items-center gap-space-xs flex-wrap">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mr-1">
              Quick Filters:
            </span>
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer ${
                vegOnly
                  ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                  : 'bg-[#ECFDF5] text-[#065F46] hover:bg-secondary-container'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${vegOnly ? 'bg-white' : 'bg-[#10B981]'}`}></span>
              <span>Veg Only</span>
            </button>
            <button
              onClick={() => setBestsellerOnly(!bestsellerOnly)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md shadow-sm transition-all cursor-pointer ${
                bestsellerOnly
                  ? 'bg-primary-container text-on-primary font-bold'
                  : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface'
              }`}
            >
              <span>🔥 Bestsellers</span>
            </button>
            <button
              onClick={() => setUnderTenMinOnly(!underTenMinOnly)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md shadow-sm transition-all cursor-pointer ${
                underTenMinOnly
                  ? 'bg-primary-container text-on-primary font-bold'
                  : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span>Prep under 10 min</span>
            </button>
            <button
              onClick={() => setPlusDealsOnly(!plusDealsOnly)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md shadow-[0_0_0_1px_rgba(245,158,11,0.25)] transition-all cursor-pointer ${
                plusDealsOnly
                  ? 'bg-amber-500 text-white font-bold'
                  : 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-amber-600">stars</span>
              <span>Plus Member Deals</span>
            </button>
          </div>
        </section>

        {/* Main Workspace Split: Menu Grid & Side Cart Drawer */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
          {/* 8-Column Food Catalogue */}
          <section className="xl:col-span-8 flex flex-col gap-space-lg">
            {/* Section Header with Meta counters */}
            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-bold">
                  Chef's Fresh Station
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface mt-0.5 font-bold">
                  {selectedCategory === 'All Items' ? 'Popular Student Cravings' : selectedCategory}
                </h2>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Showing {filteredItems.length} curated campus hits
              </span>
            </div>

            {/* Food Item Grid */}
            {isLoadingMenu && menuItems.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm animate-pulse border border-surface-container/50">
                    <div className="w-full aspect-[4/3] bg-surface-container rounded-xl mb-3"></div>
                    <div className="h-5 bg-surface-container rounded-md w-3/4 mb-2"></div>
                    <div className="h-4 bg-surface-container rounded-md w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-space-2xl bg-surface-container-lowest rounded-3xl text-center shadow-sm">
                <span className="material-symbols-outlined text-5xl text-outline mb-2">fastfood</span>
                <h3 className="font-title-lg text-title-lg text-on-surface font-bold">No items found</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  Try adjusting your search keywords or resetting the filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All Items');
                    setVegOnly(false);
                    setBestsellerOnly(false);
                    setUnderTenMinOnly(false);
                    setPlusDealsOnly(false);
                  }}
                  className="mt-4 px-space-md py-2 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {filteredItems.map(item => (
                  <FoodCard key={item.id} item={item} />
                ))}
              </div>
            )}

            {/* Fresh Kitchen Promise Banner */}
            <div className="flex flex-col sm:flex-row items-center gap-space-md p-space-lg rounded-2xl bg-surface-container-low shadow-sm mt-space-md border border-surface-container/60">
              <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-md">
                <span className="material-symbols-outlined text-2xl">eco</span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h4 className="font-title-md text-title-md text-on-surface font-bold">Fresh Campus Kitchen Promise</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  All cottage cheese (paneer) is sourced daily from the university dairy farm. ZERO palm oil is used in our fryers.
                </p>
              </div>
              <button
                onClick={() => alert("Nutrition Ledger:\n- 100% Zero Trans Fats\n- Farm Fresh Dairy Daily\n- Allergen-safe frying stations")}
                className="font-label-md text-label-md text-primary hover:underline shrink-0 font-bold"
              >
                View Nutrition Ledger →
              </button>
            </div>
          </section>

          {/* 4-Column Sticky Cart Summary Panel / Tray */}
          <aside className="xl:col-span-4 w-full sticky top-28 hidden xl:block">
            <CartTray />
          </aside>
        </div>
      </div>
    </div>
  );
};
