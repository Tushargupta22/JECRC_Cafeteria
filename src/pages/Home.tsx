import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useStudent } from '../context/StudentContext';
import { useAdminKitchen } from '../context/AdminKitchenContext';
import { COUNTERS_DATA, INITIAL_MENU_ITEMS, MenuItem } from '../data/mockData';
import { offerApi, leaderboardApi, BackendOffer, LeaderboardEntry } from '../services/api';

export const Home: React.FC = () => {
  const { itemCount, total, addToCart, setIsCartDrawerOpen, applyCoupon } = useCart();
  const { student, user, isAuthenticated, openAuthModal } = useStudent();
  const { menuItems } = useAdminKitchen();

  const [recommendedCategory, setRecommendedCategory] = useState<'all' | 'beverages' | 'grill' | 'healthy'>('all');
  const [copiedCode, setCopiedCode] = useState(false);
  const [personalizedOffer, setPersonalizedOffer] = useState<BackendOffer | null>(null);
  const [isOfferLoading, setIsOfferLoading] = useState<boolean>(false);
  const [offerError, setOfferError] = useState<boolean>(false);
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([]);
  const [popularDealItems, setPopularDealItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    const fetchData = () => {
      setIsOfferLoading(true);
      if (isAuthenticated) {
        offerApi
          .getPersonalizedOffers()
          .then((res) => {
            setIsOfferLoading(false);
            setOfferError(false);
            const offer =
              res.recommendations?.[0] || res.offer || res.offers?.[0] || null;
            setPersonalizedOffer(offer);
          })
          .catch(() => {
            setIsOfferLoading(false);
            setOfferError(true);
          });
      } else {
        offerApi
          .getOffers()
          .then((res) => {
            setIsOfferLoading(false);
            setOfferError(false);
            const general =
              res.offers?.find(
                (o) => o.targetAudience === 'new_users' || o.couponCode === 'JECRC50'
              ) || res.offers?.[0] || null;
            setPersonalizedOffer(general);
          })
          .catch(() => {
            setIsOfferLoading(false);
            setOfferError(true);
          });
      }

      leaderboardApi.getLeaderboard('daily').then(res => {
        if (res && res.leaderboard) {
          setTopUsers(res.leaderboard.slice(0, 3));
        } else {
          setTopUsers([]);
        }
      }).catch(() => {
        setTopUsers([]);
      });
    };

    // Initial fetch
    fetchData();

    // Auto-refresh leaderboard every 15 seconds
    const refreshInterval = setInterval(() => {
      leaderboardApi.getLeaderboard('daily').then(res => {
        if (res && res.leaderboard) {
          setTopUsers(res.leaderboard.slice(0, 3));
        } else {
          setTopUsers([]);
        }
      }).catch(() => {
        setTopUsers([]);
      });
    }, 15000);

    return () => clearInterval(refreshInterval);
  }, [user, isAuthenticated]);

  // Generate personalized "Popular Today" deal based on user preferences
  useEffect(() => {
    if (!menuItems || menuItems.length === 0) return;
    
    // Personalize deal based on user order history (from localStorage or user data)
    const userOrderHistory = localStorage.getItem('cafeteria_recent_orders');
    let mainItem: MenuItem | undefined;
    let beverageItem: MenuItem | undefined;
    
    if (userOrderHistory && isAuthenticated) {
      try {
        const recentOrders = JSON.parse(userOrderHistory);
        // Find most ordered category
        const categoryCount: Record<string, number> = {};
        recentOrders.forEach((order: any) => {
          if (order.category) {
            categoryCount[order.category] = (categoryCount[order.category] || 0) + 1;
          }
        });
        
        const favoriteCategory = Object.keys(categoryCount).sort((a, b) => categoryCount[b] - categoryCount[a])[0];
        
        // Find item from favorite category (excluding beverages for main item)
        mainItem = menuItems.find(item => 
          item.category === favoriteCategory && 
          !item.category.toLowerCase().includes('beverage')
        );
      } catch (e) {
        // Fallback to default
      }
    }
    
    // Fallback: use popular or chef special items
    if (!mainItem) {
      mainItem = menuItems.find(item => 
        (item.isPopular || item.isChefSpecial) && 
        !item.category.toLowerCase().includes('beverage')
      ) || menuItems.find(item => 
        !item.category.toLowerCase().includes('beverage')
      ) || menuItems[1];
    }
    
    // Find a beverage to pair with
    beverageItem = menuItems.find(item => 
      item.category.toLowerCase().includes('beverage') ||
      item.name.toLowerCase().includes('coffee') ||
      item.name.toLowerCase().includes('cold brew') ||
      item.name.toLowerCase().includes('chai')
    );
    
    // Set the deal items (rotate based on time for variety)
    const hourOfDay = new Date().getHours();
    if (hourOfDay >= 6 && hourOfDay < 12) {
      // Morning: breakfast items + chai
      const breakfastItem = menuItems.find(item => 
        item.name.toLowerCase().includes('sandwich') ||
        item.name.toLowerCase().includes('toast')
      ) || mainItem;
      const chaiItem = menuItems.find(item => item.name.toLowerCase().includes('chai')) || beverageItem;
      setPopularDealItems([breakfastItem, chaiItem].filter(Boolean) as MenuItem[]);
    } else if (hourOfDay >= 12 && hourOfDay < 17) {
      // Afternoon: burger/meal + cold brew
      const lunchItem = menuItems.find(item => 
        item.name.toLowerCase().includes('burger') ||
        item.category.toLowerCase().includes('meal')
      ) || mainItem;
      const coffeeItem = menuItems.find(item => 
        item.name.toLowerCase().includes('cold brew') ||
        item.name.toLowerCase().includes('coffee')
      ) || beverageItem;
      setPopularDealItems([lunchItem, coffeeItem].filter(Boolean) as MenuItem[]);
    } else {
      // Evening: snack + beverage
      const snackItem = menuItems.find(item => 
        item.category.toLowerCase().includes('snack')
      ) || mainItem;
      setPopularDealItems([snackItem, beverageItem].filter(Boolean) as MenuItem[]);
    }
  }, [menuItems, isAuthenticated, user]);

  // Recommended meals from backend or initial fallback
  const sourceItems = menuItems.length > 0 ? menuItems : INITIAL_MENU_ITEMS;
  const recommendedItems = sourceItems.slice(0, 6);

  const filteredRecommended = recommendedItems.filter(item => {
    if (recommendedCategory === 'beverages') {
      return item.category.includes('Beverages') ||
             item.category.includes('Shakes') ||
             item.category.includes('Coffee') ||
             item.category.includes('Tea');
    }
    if (recommendedCategory === 'grill') return item.station.includes('Grill') || item.name.includes('Burger');
    if (recommendedCategory === 'healthy') return item.category.includes('Healthy') || item.category.includes('Meals');
    return true;
  });

  const handleCopyCoupon = async (code: string) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    await applyCoupon(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleQuickAdd = (item: MenuItem) => {
    addToCart(item, 1);
  };

  // Handle Popular Today Deal - Add combo items (dynamically personalized)
  const handlePopularDealAdd = () => {
    // Use personalized deal items if available, otherwise fallback to default
    const dealItems = popularDealItems.length > 0 ? popularDealItems : [sourceItems[1], sourceItems.find(item => item.category.toLowerCase().includes('beverage'))].filter(Boolean);
    
    // Add all items in the deal to cart
    dealItems.forEach(item => {
      if (item) {
        addToCart(item, 1);
      }
    });
  };

  return (
    <div className="flex flex-col w-full">
      {/* Student Status Bar (Authenticated) or Guest Welcome Bar */}
      <section className="z-10 relative bg-surface-container-lowest shadow-sm py-space-md border-surface-container/60 border-b w-full">
        <div className="mx-auto px-gutter-desktop max-w-container-max">
          {isAuthenticated ? (
            <div className="flex lg:flex-row flex-col lg:justify-between lg:items-center gap-space-md">
              {/* Left: Student identity & major */}
              <div className="flex items-center gap-space-md">
                <div className="relative shrink-0">
                  <div className="bg-gradient-to-tr from-primary-container to-secondary-container shadow-sm p-0.5 rounded-full w-12 h-12">
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="rounded-full w-full h-full object-cover"
                    />
                  </div>
                  <span className="right-0 bottom-0 bg-secondary-fixed absolute rounded-full ring-2 ring-surface-container-lowest w-3.5 h-3.5"></span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-space-xs">
                    <h1 className="font-headline-sm text-headline-sm text-on-surface leading-tight">
                      Good Morning, {student.name.split(' ')[0]} 👋
                    </h1>
                    <span className="bg-surface-container px-space-xs py-0.5 rounded-full font-label-sm font-semibold text-label-sm text-on-surface-variant">
                      {student.department}, {student.year}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {student.hall} • Student ID #{student.studentId}
                  </p>
                </div>
              </div>

              {/* Right: Active Badges / Gamified Pills */}
              <div className="flex flex-wrap lg:justify-end items-center gap-space-xs">
                {/* Plus Tier Pill */}
                <Link
                  to="/rewards-plus"
                  className="flex items-center gap-space-2xs bg-surface-container-low shadow-sm hover:shadow px-space-sm py-space-xs rounded-full transition-all cursor-pointer shrink-0"
                >
                  <span className="text-secondary text-lg material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    stars
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="font-label-sm font-bold text-label-sm text-on-surface">
                      {student.isPlusMember ? 'Cafeteria Plus' : 'Standard Member'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant leading-none">
                      {student.isPlusMember ? `Valid till ${student.plusExpiry}` : 'Upgrade for 10% OFF'}
                    </span>
                  </div>
                </Link>

                {/* Points Pill with mini progress */}
                <Link
                  to="/rewards-plus"
                  className="flex items-center gap-space-xs bg-surface-container-low hover:bg-surface-container shadow-sm px-space-sm py-space-xs rounded-full transition-colors shrink-0"
                >
                  <span className="text-base">🪙</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm font-bold text-label-sm text-on-surface">{student.points} Points</span>
                    <span className="font-semibold text-[10px] text-primary leading-none">Redeem meals</span>
                  </div>
                </Link>

                {/* Rank Pill */}
                <Link
                  to="/live-leaderboard"
                  className="flex items-center gap-space-2xs bg-surface-container-low hover:bg-surface-container shadow-sm px-space-sm py-space-xs rounded-full transition-colors shrink-0"
                >
                  <span className="text-amber-500 text-lg material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    military_tech
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-sm font-bold text-label-sm text-on-surface">
                      {student.dailyRank > 0 ? `Rank #${student.dailyRank} Today` : 'Unranked Today'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant leading-none">₹{student.dailySpend} spent</span>
                  </div>
                </Link>

                {/* Streak Pill */}
                <div className="flex items-center gap-space-2xs bg-surface-container-low shadow-sm px-space-sm py-space-xs rounded-full shrink-0">
                  <span className="text-base">🔥</span>
                  <span className="font-label-sm font-bold text-label-sm text-primary">
                    {student.orderStreakDays}-Day Order Streak
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-space-md">
              <div className="flex items-center gap-space-md">
                <div className="flex justify-center items-center bg-primary-container/10 shadow-sm rounded-2xl w-12 h-12 text-primary shrink-0">
                  <span className="text-2xl material-symbols-outlined">restaurant</span>
                </div>
                <div>
                  <h1 className="font-headline-sm font-bold text-headline-sm text-on-surface leading-tight">
                    Welcome to JECRC Cafeteria 👋
                  </h1>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Smart campus dining • Pre-order meals, track live kitchen tokens &amp; earn loyalty rewards
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-xs">
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'student')}
                  className="flex items-center gap-1.5 bg-primary-container shadow-sm hover:shadow px-space-md py-2 rounded-xl font-label-md font-bold text-label-md text-on-primary transition-all cursor-pointer"
                >
                  <span className="text-lg material-symbols-outlined">login</span>
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('register', 'student')}
                  className="bg-surface-container hover:bg-surface-container-high px-space-sm py-2 rounded-xl font-label-md font-semibold text-label-md text-on-surface transition-colors cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative pt-space-xl pb-space-2xl w-full overflow-hidden">
        {/* Ambient color orb in background */}
        <div className="top-1/4 -left-20 bg-primary-fixed/20 absolute blur-3xl rounded-full w-96 h-96 pointer-events-none"></div>
        <div className="right-10 bottom-0 absolute bg-secondary-container/20 blur-3xl rounded-full w-80 h-80 pointer-events-none"></div>

        <div className="z-10 relative mx-auto px-gutter-desktop max-w-container-max">
          <div className="items-center gap-space-xl grid grid-cols-1 lg:grid-cols-12">
            {/* Left Content */}
            <div className="z-10 flex flex-col space-y-space-md lg:col-span-6">
              <div className="inline-flex items-center gap-space-xs bg-surface-container shadow-sm mb-space-xs px-space-sm py-space-2xs rounded-full w-fit">
                <span className="bg-secondary rounded-full w-2.5 h-2.5 animate-pulse"></span>
                <span className="font-label-md font-bold text-label-md text-on-secondary-container uppercase tracking-wider">
                  Live Cafeteria Sync
                </span>
                <span className="text-outline">•</span>
                <span className="font-label-sm font-medium text-label-sm text-on-surface-variant">
                  Smart Pre-Order Enabled
                </span>
              </div>

              <h2 className="pb-space-2xs font-display-hero text-display-hero text-on-surface leading-tight tracking-tight">
                Your Campus Food, <br className="hidden sm:inline" />
                <span className="bg-clip-text bg-gradient-to-r from-primary to-primary-container text-transparent">
                  Smarter.
                </span>
              </h2>

              <p className="pb-space-2xs max-w-xl font-body-lg text-body-lg text-on-surface-variant">
                Order your favourite cafeteria food, earn rewards, unlock exclusive offers and climb today's leaderboard without standing in line.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-space-sm pt-space-xs pb-space-xs">
                <Link
                  to="/menu"
                  className="flex items-center gap-space-xs bg-primary-container shadow-md hover:shadow-xl px-space-lg rounded-full h-12 font-label-lg font-bold text-label-lg text-on-primary transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span className="text-lg material-symbols-outlined">restaurant_menu</span>
                  <span>Order Now</span>
                </Link>
                <Link
                  to="/rewards-plus"
                  className="flex items-center gap-space-xs bg-surface-container-lowest hover:bg-surface-container-low shadow-sm hover:shadow-md px-space-lg rounded-full h-12 font-label-lg font-semibold text-label-lg text-on-surface transition-all"
                >
                  <span className="text-secondary text-lg material-symbols-outlined">redeem</span>
                  <span>Explore Offers &amp; Rewards</span>
                </Link>
              </div>

              {/* Micro Metric Highlights */}
              <div className="gap-space-sm grid grid-cols-3 pt-space-sm max-w-lg">
                <div className="flex flex-col bg-surface-container-lowest shadow-sm p-space-sm border border-surface-container/50 rounded-xl">
                  <div className="flex items-center gap-1 text-primary">
                    <span className="text-lg material-symbols-outlined">bolt</span>
                    <span className="font-headline-sm font-bold text-headline-sm">8-12m</span>
                  </div>
                  <span className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">Avg Pickup Time</span>
                </div>
                <div className="flex flex-col bg-surface-container-lowest shadow-sm p-space-sm border border-surface-container/50 rounded-xl">
                  <div className="flex items-center gap-1 text-amber-500">
                    <span className="text-lg material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-headline-sm font-bold text-headline-sm">4.8</span>
                  </div>
                  <span className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">Campus Rating</span>
                </div>
                <div className="flex flex-col bg-surface-container-lowest shadow-sm p-space-sm border border-surface-container/50 rounded-xl">
                  <div className="flex items-center gap-1 text-secondary">
                    <span className="text-lg material-symbols-outlined">savings</span>
                    <span className="font-headline-sm font-bold text-headline-sm">10%</span>
                  </div>
                  <span className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">Back in Coins</span>
                </div>
              </div>
            </div>

            {/* Right Visual with Floating Info */}
            <div className="relative flex justify-center lg:justify-end lg:col-span-6 pb-space-lg lg:pb-0">
              <div className="group z-10 relative shadow-2xl border border-surface-container/50 rounded-3xl w-full max-w-lg aspect-[4/3] overflow-hidden">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_n4ZNUD3tWPyfkLm9_fAH9oL8AqHkoZjYMovY66c7pWg_Ycbc_PA1MvJEwvYgeVSxorIc8nuh7LbsVoJoTblTTwkj7lxfh84ttgpp4AU9Q8z6-uY_O8ZP-V4L1YE41hfKZf6JzjAmBiZj6RKVt1SS5jqzFrg1uWSdwv_N_5KcLY-JFlIgFriEoRDFUJaG6kgxSzvgqsqYIxV83laglQO_TYpA1IRj6uKx-atRQHhxA_mp73MdG9qh"
                  alt="Gourmet double smash burger with seasoned fries and cold hazelnut milkshake"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent"></div>

                {/* Overlaid chips */}
                <div className="top-4 left-4 z-20 absolute flex items-center gap-space-xs bg-surface-container-lowest/90 shadow-md backdrop-blur-md px-space-sm py-space-2xs rounded-full">
                  <span className="bg-secondary rounded-full w-2 h-2"></span>
                  <span className="font-label-sm font-bold text-label-sm text-on-surface">⚡ 8-12 min avg pickup</span>
                </div>
                <div className="top-4 right-4 z-20 absolute flex items-center gap-space-2xs bg-surface-container-lowest/90 shadow-md backdrop-blur-md px-space-sm py-space-2xs rounded-full text-on-surface">
                  <span className="text-amber-500 text-sm material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label-sm font-bold text-label-sm">4.8/5 campus rating</span>
                </div>

                {/* Bottom Floating Tray Card */}
                <div className="bottom-4 z-20 absolute inset-x-4 flex justify-between items-center bg-surface-container-lowest/95 shadow-lg backdrop-blur-md p-space-sm rounded-2xl">
                  <div className="flex items-center gap-space-sm">
                    <div className="bg-primary-fixed flex justify-center items-center rounded-xl w-10 h-10 font-bold text-primary text-xl shrink-0">
                      🍔
                    </div>
                    <div>
                      <h3 className="font-title-md font-bold text-on-surface text-title-md leading-snug">
                        {sourceItems[0]?.name || 'The Quad Smash Platter'}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {sourceItems[0]?.description?.substring(0, 40) || 'Smash Double + Crispy Fries + Shake'}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-xs shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="font-label-sm font-bold text-label-sm text-secondary">🪙 10 pts/₹100</span>
                      <span className="font-title-lg font-bold text-primary text-title-lg">
                        ₹{sourceItems[0]?.price || 160}
                      </span>
                    </div>
                    <button
                      onClick={() => sourceItems[0] && handleQuickAdd(sourceItems[0])}
                      className="flex justify-center items-center bg-primary-container hover:bg-primary shadow-sm rounded-full w-9 h-9 text-on-primary active:scale-95 transition-colors cursor-pointer"
                    >
                      <span className="text-base material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Cafeteria Counter Rush Status */}
      <section className="bg-surface-container-low py-space-lg w-full">
        <div className="mx-auto px-gutter-desktop max-w-container-max">
          <div className="flex md:flex-row flex-col justify-between items-stretch md:items-center gap-space-lg bg-surface-container-lowest shadow-sm p-space-lg border border-surface-container/60 rounded-3xl">
            <div className="flex items-center gap-space-md min-w-max">
              <div className="flex justify-center items-center bg-surface-container-high rounded-2xl w-12 h-12 text-on-surface">
                <span className="text-primary text-2xl material-symbols-outlined">microwave</span>
              </div>
              <div>
                <div className="flex items-center gap-space-2xs">
                  <span className="font-title-lg font-bold text-on-surface text-title-lg">Live Counter Rush Status</span>
                  <span className="inline-block bg-secondary rounded-full w-2 h-2 animate-ping"></span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Real-time camera queue estimation at North Hall</p>
              </div>
            </div>

            {/* Meter Cards */}
            <div className="gap-space-sm grid grid-cols-1 sm:grid-cols-3 w-full">
              {COUNTERS_DATA.map(counter => (
                <div key={counter.id} className="flex justify-between items-center bg-surface-container-low p-space-sm rounded-2xl">
                  <div className="flex items-center gap-space-xs">
                    <div className={`w-3 h-3 rounded-full ${counter.colorClass === 'secondary' ? 'bg-secondary' : 'bg-primary-container'}`}></div>
                    <div>
                      <span className="block font-label-md font-semibold text-label-md text-on-surface">{counter.name}</span>
                      <span className={`font-body-sm text-body-sm font-bold ${counter.colorClass === 'secondary' ? 'text-secondary' : 'text-primary'}`}>
                        {counter.statusText}
                      </span>
                    </div>
                  </div>
                  <span className={`px-space-xs py-0.5 rounded-full font-label-sm text-label-sm font-bold ${
                    counter.colorClass === 'secondary' ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary-fixed text-on-primary-fixed-variant'
                  }`}>
                    {counter.waitMinutes} min wait
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Today's Highlights Grid (4 Interactive Cards) */}
      <section className="py-space-2xl w-full" id="highlights">
        <div className="mx-auto px-gutter-desktop max-w-container-max">
          <div className="flex md:flex-row flex-col justify-between md:items-end gap-space-xs mb-space-lg">
            <div>
              <span className="font-label-md font-bold text-label-md text-primary uppercase tracking-widest">Curated Campus Pulse</span>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Today's Highlights</h3>
            </div>
            <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
              Special offers, trending culinary items, and the campus leaderboard updated live every 60s.
            </p>
          </div>

          <div className="gap-space-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Popular Today */}
            <div className="group flex flex-col justify-between bg-surface-container-lowest shadow-sm hover:shadow-xl p-space-md border border-surface-container/60 rounded-3xl transition-all duration-300">
              <div>
                <div className="flex justify-between items-center mb-space-sm">
                  <span className="bg-primary-fixed flex items-center gap-1 px-space-xs py-0.5 rounded-full font-label-sm font-bold text-label-sm text-primary">
                    🔥 Popular Today
                  </span>
                  <span className="flex items-center gap-0.5 font-label-sm text-label-sm text-on-surface-variant">
                    <span className="text-secondary text-xs material-symbols-outlined">sync</span> Live
                  </span>
                </div>
                <div className="relative mb-space-sm rounded-2xl w-full h-36 overflow-hidden">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCF9JFlz8t5HmXqBACQMPWqe3OD_IgG9pPYqIBQjppht1KQyrheOuhSZHagXv9j3cYRoaSWfgcWJVhqEiJoAbytsAgWgfLyOGEVXCdaAfgOZHt2dujlhFOojyCysP4dfsaeMUnCvOmJ_yL8heBcj_m60z7e_IQCAtq41nmUc9_2iIkVXI_grVWzLL-JDWWpsCEKLt5GQ-QrCs4V9uTRDqdiYzA0olYquIz6L38ZaTSUyA8USM3j9tAo"
                    alt="Smash burger and chilled hazelnut cold brew"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="bottom-2 left-2 absolute flex items-center gap-1 bg-on-surface/75 backdrop-blur-sm px-space-xs py-0.5 rounded-md font-medium text-[11px] text-surface">
                    <span className="bg-secondary-fixed rounded-full w-1.5 h-1.5"></span> Ordered 42 times this lunch
                  </div>
                </div>
                <h4 className="font-title-lg font-bold text-on-surface text-title-lg leading-snug">
                  {popularDealItems[0]?.name || sourceItems[1]?.name || 'Smash Burger'} + {popularDealItems[1]?.name || 'Cold Brew'} Combo
                </h4>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  {popularDealItems[0]?.description || sourceItems[1]?.description || 'Delicious meal'} paired with {popularDealItems[1]?.name?.toLowerCase() || 'refreshing beverage'}. {isAuthenticated ? 'Personalized for you!' : 'Complete meal deal!'}
                </p>
              </div>
              <div className="flex justify-between items-center mt-space-sm pt-space-md">
                <div>
                  <span className="font-title-lg font-bold text-primary text-title-lg">
                    ₹{((popularDealItems[0]?.price || sourceItems[1]?.price || 60) + (popularDealItems[1]?.price || 80))}
                  </span>
                  <span className="ml-1 font-body-sm text-body-sm text-on-surface-variant line-through">
                    ₹{((popularDealItems[0]?.originalPrice || popularDealItems[0]?.price || sourceItems[1]?.price || 75) + (popularDealItems[1]?.originalPrice || popularDealItems[1]?.price || 95))}
                  </span>
                </div>
                <button
                  onClick={handlePopularDealAdd}
                  className="flex items-center gap-1 bg-primary-container hover:bg-primary px-space-sm py-space-xs rounded-full font-label-md font-bold text-label-md text-on-primary active:scale-95 transition-colors"
                >
                  <span>Quick Add</span>
                  <span className="text-sm material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            {/* Card 2: Personalized Offer */}
            <div className="from-primary-fixed/30 relative flex flex-col justify-between bg-gradient-to-br via-surface-container-lowest to-surface-container-lowest shadow-sm hover:shadow-xl p-space-md border border-surface-container/60 rounded-3xl overflow-hidden transition-all duration-300">
              <div className="-right-6 -bottom-6 absolute bg-primary-container/10 rounded-full w-28 h-28 pointer-events-none"></div>
              <div>
                <div className="flex justify-between items-center mb-space-sm">
                  <span className="flex items-center gap-1 bg-secondary-container px-space-xs py-0.5 rounded-full font-label-sm font-bold text-label-sm text-on-secondary-container">
                    🎁 Personal Perk
                  </span>
                  <span className="text-primary-container material-symbols-outlined">favorite</span>
                </div>
                <div className="relative flex flex-col justify-center items-center bg-surface-container mb-space-sm p-space-sm rounded-2xl w-full h-36 overflow-hidden text-center">
                  <div className="mb-1 text-4xl">
                    {isOfferLoading ? (
                      '🎁'
                    ) : offerError ? (
                      '⚠️'
                    ) : (
                      personalizedOffer?.icon ||
                      (personalizedOffer?.targetAudience === 'frequent_coffee'
                        ? '☕'
                        : personalizedOffer?.targetAudience === 'subscribers'
                        ? '⭐'
                        : personalizedOffer?.targetAudience === 'frequent_burgers'
                        ? '🍔'
                        : personalizedOffer?.targetAudience === 'frequent_chai'
                        ? '🍵'
                        : personalizedOffer?.targetAudience === 'new_users'
                        ? '🎉'
                        : '🍟')
                    )}
                  </div>
                  <span className="font-label-sm font-medium text-label-sm text-on-surface-variant">
                    {isOfferLoading
                      ? 'Analyzing Taste Profile'
                      : offerError
                      ? 'Campus Perks'
                      : personalizedOffer?.badgeText ||
                        (personalizedOffer?.targetAudience === 'new_users'
                          ? 'New Student Welcome'
                          : 'Personal Perk')}
                  </span>
                  <span className="font-title-lg font-bold text-primary text-title-lg">
                    {isOfferLoading
                      ? 'Loading personalized offer...'
                      : offerError
                      ? 'Unable to load personalized offers'
                      : personalizedOffer
                      ? personalizedOffer.title
                      : 'No personalized offer available'}
                  </span>
                </div>
                <h4 className="font-title-lg font-bold text-on-surface text-title-lg leading-snug">
                  {isOfferLoading
                    ? 'Checking your real cafeteria order history...'
                    : offerError
                    ? 'Please refresh or check your connection.'
                    : personalizedOffer
                    ? personalizedOffer.description
                    : 'Order your favourite meal to unlock perks.'}
                </h4>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  {personalizedOffer?.recommendationReason ||
                    'Automatic campus loyalty reward applied on your checkout today.'}
                </p>
              </div>
              <div className="mt-space-sm pt-space-md">
                <div className="flex justify-between items-center bg-surface-container-low mb-space-xs p-space-xs rounded-xl">
                  <div className="flex flex-col">
                    <span className="font-bold text-[10px] text-on-surface-variant uppercase">Coupon Code</span>
                    <span className="font-label-md font-mono font-bold text-label-md text-primary">
                      {isOfferLoading ? '...' : personalizedOffer ? personalizedOffer.couponCode : 'N/A'}
                    </span>
                  </div>
                  <button
                    disabled={!personalizedOffer?.couponCode}
                    onClick={() => handleCopyCoupon(personalizedOffer?.couponCode || '')}
                    className="bg-surface-container-highest hover:bg-surface-container px-space-xs py-1 rounded-lg font-bold text-on-surface text-xs transition-colors disabled:opacity-50"
                  >
                    {copiedCode ? 'Applied!' : 'Copy'}
                  </button>
                </div>
                <button
                  disabled={!personalizedOffer?.couponCode}
                  onClick={() => handleCopyCoupon(personalizedOffer?.couponCode || '')}
                  className="bg-surface-container-highest hover:bg-surface-container py-space-xs rounded-full w-full font-label-md font-bold text-label-md text-on-surface text-center transition-colors disabled:opacity-50"
                >
                  Apply Code Now
                </button>
              </div>
            </div>

            {/* Card 3: Today's Leaderboard Preview */}
            <div className="flex flex-col justify-between bg-surface-container-lowest shadow-sm hover:shadow-xl p-space-md border border-surface-container/60 rounded-3xl transition-all duration-300">
              <div>
                <div className="flex justify-between items-center mb-space-sm">
                  <span className="flex items-center gap-1 bg-amber-100 px-space-xs py-0.5 rounded-full font-label-sm font-bold text-amber-800 text-label-sm">
                    🏆 Top Spenders Today
                  </span>
                  <span className="bg-amber-500 rounded-full w-2 h-2 animate-pulse"></span>
                </div>
                <h4 className="font-title-lg font-bold text-on-surface text-title-lg leading-snug">Campus Leaderboard</h4>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  Spend daily to win free combo passes &amp; gold status badge.
                </p>

                {/* Leaderboard Mini List */}
                <div className="space-y-space-xs mt-space-sm">
                  {topUsers.length > 0 ? (
                    topUsers.map(u => (
                      <div
                        key={u.rank}
                        className={`flex items-center justify-between p-space-xs rounded-xl ${
                          u.isCurrentUser ? 'bg-amber-50/80 border border-amber-200/50' : 'bg-surface-container-low'
                        }`}
                      >
                        <div className="flex items-center gap-space-xs">
                          <span className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center ${
                            u.rank === 1 ? 'bg-amber-400 text-amber-950' : u.rank === 2 ? 'bg-slate-200 text-slate-700' : 'bg-amber-700/20 text-amber-900'
                          }`}>
                            {u.rank}
                          </span>
                          <div className="flex flex-col">
                            <span className="font-label-sm font-bold text-label-sm text-on-surface">
                              {u.name} {u.isCurrentUser ? '(You)' : ''}
                            </span>
                            <span className="text-[10px] text-on-surface-variant">{u.department}</span>
                          </div>
                        </div>
                        <span className="font-label-sm font-bold text-label-sm text-primary">₹{u.spend}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col justify-center items-center gap-2 py-space-md text-center">
                      <div className="text-3xl">🏆</div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        No rankings yet. Be the first to order!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-space-xs pt-space-md">
                <Link
                  to="/live-leaderboard"
                  className="flex justify-center items-center gap-1 font-label-sm font-bold text-label-sm text-primary hover:underline"
                >
                  <span>View Full Leaderboard (Top 50)</span>
                  <span className="text-sm material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
            </div>

            {/* Card 4: Plus Upsell */}
            <div className="relative flex flex-col justify-between bg-gradient-to-br from-tertiary to-primary-container shadow-md hover:shadow-xl p-space-md rounded-3xl overflow-hidden text-on-tertiary transition-all duration-300">
              <div className="-top-10 -right-10 absolute bg-white/10 blur-xl rounded-full w-36 h-36"></div>
              <div>
                <div className="flex justify-between items-center mb-space-sm">
                  <span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-space-xs py-0.5 rounded-full font-label-sm font-bold text-label-sm text-white">
                    ⭐ Student Club
                  </span>
                  <span className="bg-secondary-fixed text-on-secondary-fixed px-1.5 py-0.5 rounded-md font-bold text-xs">
                    Save ₹1.2k/mo
                  </span>
                </div>
                <div className="my-space-md">
                  <span className="font-display-hero-mobile font-extrabold text-display-hero-mobile text-white leading-none">Plus</span>
                  <p className="mt-space-xs font-body-md text-body-md text-white/90">
                    Save up to ₹1,200/mo on daily campus meals with 0% kiosk convenience fees &amp; priority grill slots.
                  </p>
                </div>
                <ul className="space-y-space-xs font-body-sm text-body-sm text-white/95">
                  <li className="flex items-center gap-2">
                    <span className="text-secondary-fixed text-sm material-symbols-outlined">check_circle</span>
                    <span>Zero queue priority pickup</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-secondary-fixed text-sm material-symbols-outlined">check_circle</span>
                    <span>Free 200ml cold drink daily</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-secondary-fixed text-sm material-symbols-outlined">check_circle</span>
                    <span>Double rewards multiplier</span>
                  </li>
                </ul>
              </div>
              <div className="pt-space-lg">
                <Link
                  to="/rewards-plus"
                  className="block bg-white hover:bg-surface-bright shadow-md py-space-xs rounded-full w-full font-label-md font-bold text-label-md text-on-primary-container text-center transition-all"
                >
                  Manage / Extend Plus
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended For You & One-Click Re-Order */}
      <section className="bg-surface-container-low py-space-xl w-full" id="menu">
        <div className="mx-auto px-gutter-desktop max-w-container-max">
          <div className="flex md:flex-row flex-col justify-between md:items-end gap-space-sm mb-space-lg">
            <div>
              <div className="flex items-center gap-space-xs mb-1 font-label-md font-bold text-label-md text-primary uppercase tracking-wider">
                <span className="text-base material-symbols-outlined">auto_awesome</span>
                <span>Tailored Algorithm</span>
              </div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Recommended For You</h3>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                Because you love <span className="font-semibold text-on-surface">artisan coffee &amp; quick bites</span> during 11:30 AM break.
              </p>
            </div>

            {/* Quick station filter tags */}
            <div className="flex items-center gap-space-xs pb-1 overflow-x-auto">
              <button
                onClick={() => setRecommendedCategory('all')}
                className={`px-space-sm py-space-2xs rounded-full font-label-md text-label-md shrink-0 transition-colors ${
                  recommendedCategory === 'all'
                    ? 'bg-on-surface text-surface font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All For You
              </button>
              <button
                onClick={() => setRecommendedCategory('beverages')}
                className={`px-space-sm py-space-2xs rounded-full font-label-md text-label-md shrink-0 transition-colors ${
                  recommendedCategory === 'beverages'
                    ? 'bg-on-surface text-surface font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Beverages &amp; Shakes
              </button>
              <button
                onClick={() => setRecommendedCategory('grill')}
                className={`px-space-sm py-space-2xs rounded-full font-label-md text-label-md shrink-0 transition-colors ${
                  recommendedCategory === 'grill'
                    ? 'bg-on-surface text-surface font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Grill &amp; Burgers
              </button>
              <button
                onClick={() => setRecommendedCategory('healthy')}
                className={`px-space-sm py-space-2xs rounded-full font-label-md text-label-md shrink-0 transition-colors ${
                  recommendedCategory === 'healthy'
                    ? 'bg-on-surface text-surface font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Healthy Bowls
              </button>
            </div>
          </div>

          {/* Meal Cards Grid */}
          <div className="gap-space-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {filteredRecommended.map(meal => (
              <div
                key={meal.id}
                className="group flex flex-col bg-surface-container-lowest shadow-sm hover:shadow-xl border border-surface-container/60 rounded-3xl overflow-hidden transition-all duration-300"
              >
                <div className="relative w-full aspect-[4/3] overflow-hidden">
                  <img
                    src={meal.image}
                    alt={meal.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="top-3 left-3 absolute flex items-center gap-1 bg-emerald-50 shadow-sm px-space-xs py-0.5 rounded-full font-label-sm font-bold text-emerald-800 text-label-sm">
                    <span className="bg-emerald-600 rounded-full w-1.5 h-1.5"></span> Veg
                  </span>
                  <span className="top-3 right-3 absolute bg-surface-container-lowest/90 shadow-sm backdrop-blur-md px-space-xs py-0.5 rounded-full font-label-sm font-medium text-label-sm text-on-surface">
                    ⚡ {meal.prepTime}
                  </span>
                  <button
                    onClick={() => handleQuickAdd(meal)}
                    className="right-4 -bottom-4 absolute flex justify-center items-center bg-primary-container shadow-lg rounded-full w-10 h-10 text-on-primary hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="text-lg material-symbols-outlined">add</span>
                  </button>
                </div>

                <div className="flex flex-col flex-grow justify-between p-space-md pt-space-lg">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{meal.station}</span>
                      <span className="font-label-sm font-bold text-label-sm text-secondary">⚡ Fast Prep</span>
                    </div>
                    <h4 className="mt-1 font-title-lg font-bold text-on-surface text-title-lg">{meal.name}</h4>
                    <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                      {meal.description}
                    </p>
                  </div>
                  <div className="flex justify-between items-center pt-space-md">
                    <div>
                      <span className="font-title-lg font-bold text-primary text-title-lg">₹{meal.price}</span>
                      <span className="ml-1 text-on-surface-variant text-xs">+{meal.points} pts</span>
                    </div>
                    <button
                      onClick={() => handleQuickAdd(meal)}
                      className="bg-surface-container hover:bg-surface-container-high px-space-sm py-1.5 rounded-full font-label-sm font-bold text-label-sm text-on-surface transition-colors cursor-pointer"
                    >
                      Re-order
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Order Assistant Bar (Bottom Fixed Assistant) */}
      <div className="bottom-6 z-40 sticky mx-auto px-gutter-desktop w-full max-w-xl pointer-events-none">
        <div className="flex justify-between items-center gap-space-sm bg-on-surface/90 shadow-2xl backdrop-blur-xl p-space-sm rounded-full text-surface pointer-events-auto">
          <div className="flex items-center gap-space-sm pl-space-xs">
            <div className="flex justify-center items-center bg-primary-container rounded-full w-10 h-10 font-bold text-on-primary">
              <span className="text-xl material-symbols-outlined">shopping_cart</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-title-md font-bold text-surface text-title-md">
                  {itemCount} items selected
                </span>
                <span className="text-surface-dim text-xs">•</span>
                <span className="text-secondary-fixed font-label-md text-label-md">₹{total} total</span>
              </div>
              <span className="font-body-sm text-body-sm text-surface-dim text-xs">
                Ready in approx 8 mins at Counter A &amp; B
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            className="flex items-center gap-1 bg-primary-container hover:bg-primary shadow-md px-space-md rounded-full h-10 font-label-md font-bold text-label-md text-on-primary transition-all cursor-pointer shrink-0"
          >
            <span>Review Tray</span>
            <span className="text-sm material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
