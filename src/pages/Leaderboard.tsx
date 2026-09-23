import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LeaderboardUser } from '../data/mockData';
import { leaderboardApi } from '../services/api';
import { useStudent } from '../context/StudentContext';

export const Leaderboard: React.FC = () => {
  const { user } = useStudent();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);  // Empty by default, no fake data
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchLeaderboard = () => {
      leaderboardApi
        .getLeaderboard(period)
        .then(res => {
          console.log('[Leaderboard Frontend] API Response:', res);
          console.log('[Leaderboard Frontend] Has leaderboard?', !!res?.leaderboard);
          console.log('[Leaderboard Frontend] Leaderboard length:', res?.leaderboard?.length);
          
          if (!isMounted) return;
          // FIXED: Only show real users from database, no fallback to mock data
          if (res && res.leaderboard) {
            const mapped: LeaderboardUser[] = res.leaderboard.map(u => ({
              rank: u.rank,
              name: u.name,
              shortName: u.shortName || u.name.split(' ')[0],
              department: u.department || 'Campus Student',
              spend: u.spend,
              points: u.points,
              ordersCount: u.ordersCount,
              avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
              isCurrentUser: u.isCurrentUser || (user ? (u.userId === user._id || u.name === user.name) : false)
            }));
            console.log('[Leaderboard Frontend] Mapped users:', mapped.length);
            setUsers(mapped);
          } else {
            console.log('[Leaderboard Frontend] No leaderboard data, setting empty array');
            // If no users, show empty array (not mock data)
            setUsers([]);
          }
        })
        .catch(err => {
          console.error('Failed to load leaderboard for period:', period, err);
          // On error, show empty array (not mock data)
          setUsers([]);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    };

    // Initial fetch
    fetchLeaderboard();

    // Auto-refresh every 10 seconds for live updates
    const refreshInterval = setInterval(() => {
      if (isMounted) {
        fetchLeaderboard();
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, [period, user]);

  // FIXED: Properly construct podium with users in correct positions
  // Podium visual layout: [2nd, 1st, 3rd] but only show users that actually exist
  const rank1User = users.find(u => u.rank === 1);
  const rank2User = users.find(u => u.rank === 2);
  const rank3User = users.find(u => u.rank === 3);

  const remaining = users.filter(u => u.rank > 3);

  // Check if we have at least 1 user to show the podium
  const hasEnoughUsers = Boolean(rank1User || rank2User || rank3User);

  return (
    <div className="bg-surface w-full min-h-screen">
      <div className="space-y-space-xl mx-auto px-gutter-desktop py-space-xl w-full max-w-container-max">
        {/* Header Title & Period Filter */}
        <div className="flex lg:flex-row flex-col justify-between items-start lg:items-end gap-space-md">
          <div>
            <div className="flex items-center gap-space-xs mb-1 font-label-md font-bold text-label-md text-primary uppercase tracking-wider">
              <span className="text-base material-symbols-outlined">military_tech</span>
              <span>Campus Food Championship</span>
            </div>
            <h1 className="font-display-hero-mobile md:font-display-hero font-extrabold text-on-surface tracking-tight">
              {period === 'daily' ? 'Daily Top Spenders' : period === 'weekly' ? 'Weekly Standings' : 'Monthly Hall of Fame'}
            </h1>
            <p className="mt-1 max-w-xl font-body-md text-body-md text-on-surface-variant">
              Real-time rankings calculated live from North Dining Hall &amp; Express Kiosks.
            </p>
          </div>

          <div className="flex sm:flex-row flex-col items-start sm:items-center gap-3">
            {/* Period Tabs */}
            <div className="flex bg-surface-container-low shadow-sm p-1 border border-surface-container rounded-2xl">
              <button
                onClick={() => setPeriod('daily')}
                className={`px-4 py-1.5 rounded-xl font-label-md text-label-md font-bold transition-all cursor-pointer ${
                  period === 'daily'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-4 py-1.5 rounded-xl font-label-md text-label-md font-bold transition-all cursor-pointer ${
                  period === 'weekly'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setPeriod('monthly')}
                className={`px-4 py-1.5 rounded-xl font-label-md text-label-md font-bold transition-all cursor-pointer ${
                  period === 'monthly'
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                This Month
              </button>
            </div>

            <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs border border-surface-container rounded-2xl">
              <span className="bg-secondary rounded-full w-2.5 h-2.5 animate-pulse"></span>
              <span className="font-label-md font-bold text-label-md text-on-surface">MongoDB Live</span>
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center items-center gap-2 py-6 font-body-sm text-body-sm text-primary">
            <span className="border-2 border-primary/30 border-t-primary rounded-full w-4 h-4 animate-spin"></span>
            <span>Calculating dynamic standings...</span>
          </div>
        )}

        {/* Grand Podium Mosaic (Top 3) */}
        {!loading && !hasEnoughUsers && (
          <div className="flex flex-col justify-center items-center gap-space-md bg-surface-container-low p-space-2xl rounded-3xl text-center">
            <div className="text-6xl">🏆</div>
            <h3 className="font-headline-md font-bold text-headline-md text-on-surface">
              No Rankings Yet
            </h3>
            <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
              Be the first! Place an order to appear on the live leaderboard and start earning points.
            </p>
            <Link
              to="/menu"
              className="flex items-center gap-2 bg-primary-container hover:shadow-md px-space-lg py-space-md rounded-2xl font-label-md font-bold text-label-md text-on-primary transition-all"
            >
              <span className="material-symbols-outlined">restaurant_menu</span>
              <span>Browse Menu</span>
            </Link>
          </div>
        )}

        {!loading && hasEnoughUsers && (
          <div className="items-end gap-space-md grid grid-cols-1 md:grid-cols-3 pt-space-md">
          {/* 🥈 #2 Silver Podium Card */}
          {rank2User && (
          <div className="relative flex flex-col items-center order-2 md:order-1 bg-surface-container-lowest shadow-md p-space-lg border border-surface-container/60 rounded-3xl overflow-hidden text-center">
            <div className="-top-10 -right-10 absolute bg-surface-variant/40 blur-xl rounded-full w-24 h-24"></div>
            <div className="flex justify-center items-center bg-surface-container-high shadow-sm mb-space-xs rounded-full w-10 h-10 font-headline-sm font-bold text-headline-sm text-on-surface">
              🥈 2
            </div>
            <div className="bg-gradient-to-tr from-surface-variant via-surface-container-highest to-surface-bright shadow-sm mb-space-xs p-1 rounded-full w-20 h-20 overflow-hidden">
              <img
                src={rank2User.avatar}
                alt={rank2User.name}
                className="rounded-full w-full h-full object-cover"
              />
            </div>
            <span className="max-w-full font-headline-sm font-bold text-headline-sm text-on-surface truncate">
              {rank2User.name}
            </span>
            <span className="font-label-sm font-semibold text-label-sm text-on-surface-variant uppercase">
              {rank2User.department}
            </span>
            <div className="bg-surface-container-low mt-space-sm px-space-md py-space-xs rounded-full w-full">
              <span className="font-title-lg font-black text-on-surface text-title-lg">₹{rank2User.spend}</span>
              <span className="ml-1 font-body-sm text-body-sm text-on-surface-variant">spent</span>
            </div>
            <div className="flex items-center gap-1 mt-space-xs font-label-sm font-bold text-label-sm text-secondary">
              <span className="text-sm material-symbols-outlined">trending_up</span>
              <span>+{rank2User.points} pts</span>
            </div>
          </div>
          )}

          {/* 🥇 #1 Champion Podium Card (Central, Crowned) */}
          {rank1User && (
          <div className={`relative flex flex-col items-center order-1 md:order-2 bg-surface-container-lowest shadow-xl -mt-space-sm p-space-xl border-2 border-primary-container rounded-3xl overflow-hidden text-center ${
            !rank2User ? 'md:col-start-2' : ''
          }`}>
            <div className="top-0 absolute inset-x-0 bg-gradient-to-r from-surface-tint via-primary-container to-surface-tint h-2"></div>
            <div className="-top-12 left-1/2 absolute bg-primary-container/20 blur-2xl rounded-full w-32 h-32 -translate-x-1/2 pointer-events-none"></div>

            <div className="flex items-center gap-space-2xs bg-primary-container shadow-sm mb-space-xs px-space-sm py-space-2xs rounded-full text-on-primary-container">
              <span className="text-sm material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>crown</span>
              <span className="font-label-md font-extrabold text-label-md uppercase tracking-wider">CAMPUS LEADER</span>
            </div>

            <div className="flex justify-center items-center bg-primary-container shadow-md mb-space-xs rounded-full w-12 h-12 font-headline-md font-extrabold text-headline-md text-on-primary-container">
              🥇 1
            </div>

            <div className="bg-gradient-to-tr from-primary via-primary-container to-secondary-container shadow-md mb-space-xs p-1.5 rounded-full w-24 h-24 overflow-hidden">
              <img
                src={rank1User.avatar}
                alt={rank1User.name}
                className="rounded-full w-full h-full object-cover"
              />
            </div>

            <span className="font-headline-md font-extrabold text-headline-md text-on-surface tracking-tight">
              {rank1User.name}
            </span>
            <span className="font-label-md font-semibold text-label-md text-on-surface-variant uppercase">
              {rank1User.department}
            </span>

            <div className="bg-primary/10 mt-space-sm px-space-lg py-space-xs rounded-2xl w-full">
              <div className="py-1 font-display-hero-mobile font-black text-display-hero-mobile text-primary leading-none">
                ₹{rank1User.spend}
              </div>
              <span className="font-label-sm font-bold text-label-sm text-on-surface-variant uppercase tracking-wider">
                Total Orders: {rank1User.ordersCount} meals
              </span>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-space-xs mt-space-sm">
              <span className="flex items-center gap-1 bg-secondary-container px-space-xs py-space-2xs rounded-full font-label-sm font-bold text-label-sm text-on-secondary-container">
                <span className="text-xs material-symbols-outlined">verified</span> VIP Priority Pass
              </span>
              <span className="bg-surface-container-high px-space-xs py-space-2xs rounded-full font-label-sm font-bold text-label-sm text-on-surface">
                +{rank1User.points} Coins
              </span>
            </div>
          </div>
          )}

          {/* 🥉 #3 Bronze Podium Card */}
          {rank3User && (
          <div className="relative flex flex-col items-center order-3 bg-surface-container-lowest shadow-md p-space-lg border border-surface-container/60 rounded-3xl overflow-hidden text-center">
            <div className="-top-10 -left-10 bg-primary-fixed-dim/30 absolute blur-xl rounded-full w-24 h-24"></div>
            <div className="flex justify-center items-center bg-surface-container-high shadow-sm mb-space-xs rounded-full w-10 h-10 font-headline-sm font-bold text-headline-sm text-on-surface">
              🥉 3
            </div>
            <div className="bg-gradient-to-tr to-surface-bright shadow-sm mb-space-xs p-1 rounded-full from-outline via-outline-variant w-20 h-20 overflow-hidden">
              <img
                src={rank3User.avatar}
                alt={rank3User.name}
                className="rounded-full w-full h-full object-cover"
              />
            </div>
            <span className="max-w-full font-headline-sm font-bold text-headline-sm text-on-surface truncate">
              {rank3User.name}
            </span>
            <span className="font-label-sm font-semibold text-label-sm text-on-surface-variant uppercase">
              {rank3User.department}
            </span>
            <div className="bg-surface-container-low mt-space-sm px-space-md py-space-xs rounded-full w-full">
              <span className="font-title-lg font-black text-on-surface text-title-lg">₹{rank3User.spend}</span>
              <span className="ml-1 font-body-sm text-body-sm text-on-surface-variant">spent</span>
            </div>
            <div className="flex items-center gap-1 mt-space-xs font-label-sm font-bold text-label-sm text-secondary">
              <span className="text-sm material-symbols-outlined">trending_up</span>
              <span>+{rank3User.points} pts</span>
            </div>
          </div>
          )}
        </div>
        )}

        {/* Full Campus Standings Table */}
        {!loading && users.length > 0 && (
        <section className="space-y-space-md bg-surface-container-lowest shadow-md p-space-lg md:p-space-xl border border-surface-container/60 rounded-3xl">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-sm font-bold text-headline-sm text-on-surface">
              Complete Top Rankings
            </h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Showing {users.length} campus contenders
            </span>
          </div>

          <div className="space-y-space-xs">
            {remaining.map(u => (
              <div
                key={u.rank}
                className={`p-space-md rounded-2xl flex items-center justify-between transition-colors ${
                  u.isCurrentUser
                    ? 'bg-gradient-to-r from-primary-container/15 via-surface-container-low to-surface-container-lowest border border-primary-container/30'
                    : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-space-md">
                  <span className="w-8 font-headline-sm font-extrabold text-headline-sm text-on-surface-variant text-center">
                    {u.rank}
                  </span>
                  {u.avatar ? (
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="shadow-sm rounded-full w-11 h-11 object-cover"
                    />
                  ) : (
                    <div className="flex justify-center items-center bg-surface-container-highest rounded-full w-11 h-11 font-bold text-on-surface text-sm">
                      {u.initials || 'CB'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="block font-title-md font-bold text-on-surface text-title-md">
                        {u.name}
                      </span>
                      {u.isCurrentUser && (
                        <span className="bg-primary-container px-space-xs py-0.2 rounded-full font-label-sm font-bold text-label-sm text-on-primary">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {u.department} • {u.ordersCount} orders
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block font-headline-sm font-bold text-headline-sm text-on-surface">
                    ₹{u.spend}
                  </span>
                  <span className="font-label-sm font-bold text-label-sm text-secondary">
                    +{u.points} pts
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Rules & Rewards Tier Info */}
          <div className="gap-space-md grid grid-cols-1 md:grid-cols-3 bg-surface-container-low mt-space-xl p-space-lg rounded-2xl">
            <div className="space-y-1">
              <span className="flex items-center gap-1 font-title-md font-bold text-amber-600 text-title-md">
                🥇 Gold Tier (#1)
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Free gourmet combo thali + 2x multiplier on all tomorrow's orders.
              </p>
            </div>
            <div className="space-y-1">
              <span className="flex items-center gap-1 font-title-md font-bold text-slate-600 text-title-md">
                🥈 Silver Tier (#2)
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Free artisan beverage coupon + 1.5x points boost.
              </p>
            </div>
            <div className="space-y-1">
              <span className="flex items-center gap-1 font-title-md font-bold text-amber-800 text-title-md">
                🥉 Bronze Tier (#3)
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                ₹50 OFF instant voucher credited at midnight.
              </p>
            </div>
          </div>
        </section>
        )}
      </div>
    </div>
  );
};
