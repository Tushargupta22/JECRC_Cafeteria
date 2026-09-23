import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LeaderboardUser } from '../data/mockData';
import { useAdminKitchen } from '../context/AdminKitchenContext';
import { leaderboardApi } from '../services/api';

export const CafeteriaDisplay: React.FC = () => {
  const { tickets } = useAdminKitchen();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [displayUsers, setDisplayUsers] = useState<LeaderboardUser[]>([]);  // Empty by default, no fake data

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
      setCurrentDate(now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchLeaderboard = () => {
      leaderboardApi.getLeaderboard('daily').then(res => {
        if (res && res.leaderboard) {
          setDisplayUsers(res.leaderboard.map(u => ({
            rank: u.rank,
            name: u.name,
            shortName: u.shortName || u.name.split(' ')[0],
            department: u.department || 'Campus Student',
            spend: u.spend,
            points: u.points,
            ordersCount: u.ordersCount,
            avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
          })));
        } else {
          setDisplayUsers([]);
        }
      }).catch(() => {
        setDisplayUsers([]);
      });
    };

    // Initial fetch
    fetchLeaderboard();

    // Auto-refresh every 10 seconds for live updates
    const refreshInterval = setInterval(fetchLeaderboard, 10000);

    return () => clearInterval(refreshInterval);
  }, []);

  const readyTickets = tickets.filter(t => t.status === 'ready');
  const preparingTickets = tickets.filter(t => t.status === 'preparing' || t.status === 'new');

  // FIXED: Properly construct podium with users in correct positions
  // Podium visual layout: [2nd, 1st, 3rd] but only show users that actually exist
  const rank1User = displayUsers.find(u => u.rank === 1);
  const rank2User = displayUsers.find(u => u.rank === 2);
  const rank3User = displayUsers.find(u => u.rank === 3);

  const remainingUsers = displayUsers.slice(3, 5);  // Get ranks 4 and 5 from real data
  const hasEnoughUsers = Boolean(rank1User || rank2User || rank3User);

  return (
    <div className="flex flex-col justify-between bg-surface w-full min-h-screen text-on-surface">
      {/* Top Broadcast Header for 10-foot Viewing Distance */}
      <header className="relative bg-surface-container-lowest shadow-sm px-gutter-desktop py-space-md border-surface-container/60 border-b w-full overflow-hidden">
        <div className="-top-20 -right-20 absolute bg-primary-container/10 blur-3xl rounded-full w-80 h-80 pointer-events-none"></div>
        <div className="-bottom-16 left-1/3 absolute bg-secondary-container/15 blur-2xl rounded-full w-60 h-60 pointer-events-none"></div>

        <div className="z-10 relative flex md:flex-row flex-col justify-between items-center gap-space-sm mx-auto max-w-container-max">
          {/* Brand & Hall Node */}
          <div className="flex items-center gap-space-md">
            <Link to="/" className="flex justify-center items-center bg-primary hover:opacity-90 shadow-md rounded-2xl w-12 h-12 text-on-primary">
              <span className="text-headline-md material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                restaurant
              </span>
            </Link>
            <div>
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-lg font-black text-headline-lg text-on-surface uppercase tracking-tight">
                  JECRC Cafeteria
                </span>
                <span className="bg-primary-container px-space-xs py-space-2xs rounded-full font-label-md font-bold text-label-md text-on-primary-container uppercase tracking-wider">
                  LIVE
                </span>
              </div>
              <p className="flex items-center gap-space-2xs font-body-sm text-body-sm text-on-surface-variant">
                <span className="text-secondary text-sm material-symbols-outlined">location_on</span>
                <span>North Dining Hall • Terminal Display 04</span>
              </p>
            </div>
          </div>

          {/* Center Status / Telemetry */}
          <div className="flex items-center gap-space-sm bg-surface-container-high shadow-inner px-space-md py-space-xs rounded-full">
            <span className="relative flex w-3 h-3">
              <span className="inline-flex absolute bg-error opacity-75 rounded-full w-full h-full animate-ping"></span>
              <span className="inline-flex relative bg-error rounded-full w-3 h-3"></span>
            </span>
            <span className="font-label-md font-bold text-label-md text-on-surface uppercase tracking-wider">
              LIVE FEED • WS CONNECTED
            </span>
            <span className="rounded-full bg-outline-variant w-1.5 h-1.5"></span>
            <span className="font-body-sm font-mono text-body-sm text-on-surface-variant">24ms ping</span>
          </div>

          {/* Live Clock */}
          <div className="text-right">
            <div className="font-headline-lg font-mono font-black text-headline-lg text-on-surface tracking-tight">
              {currentTime || '12:46:18 PM'}
            </div>
            <div className="font-label-md font-semibold text-label-md text-on-surface-variant uppercase tracking-wide">
              {currentDate || 'Wednesday, 23 October • Lunch Service'}
            </div>
          </div>
        </div>
      </header>

      {/* High-Impact Live Rank Shift Alert Banner */}
      <div className="relative bg-primary-container shadow-md px-gutter-desktop py-space-sm w-full overflow-hidden text-on-primary-container">
        <div className="flex justify-between items-center mx-auto max-w-container-max">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="flex flex-shrink-0 justify-center items-center bg-surface-container-lowest rounded-full w-8 h-8 text-primary animate-bounce">
              <span className="text-title-lg material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
            </div>
            <p className="font-title-md text-title-md truncate tracking-tight">
              <strong className="bg-primary mr-space-2xs px-space-xs py-space-2xs rounded-lg font-extrabold text-label-sm text-on-primary uppercase">
                {rank1User ? 'FLASH' : 'CAMPUS LIVE'}
              </strong>
              {rank1User ? (
                <>
                  <span className="font-bold text-on-primary-container uppercase">CAMPUS #1! </span>
                  <span className="font-extrabold text-on-primary-container">{rank1User.name.toUpperCase()} </span>
                  leads today with <span className="font-black decoration-2 underline">₹{rank1User.spend}</span> spent and seized the top spot on the Daily Leaderboard!
                </>
              ) : (
                <>
                  <span className="font-bold text-on-primary-container uppercase">WELCOME TO JECRC CAFETERIA! </span>
                  Place your order today to claim the #1 spot on the Daily Leaderboard!
                </>
              )}
            </p>
          </div>
          <div className="hidden lg:flex flex-shrink-0 items-center gap-space-2xs font-label-sm font-bold text-label-sm text-on-primary-container/80 uppercase tracking-wider">
            <span className="text-sm material-symbols-outlined">schedule</span>
            <span>Resets 11:59 PM IST</span>
          </div>
        </div>
      </div>

      {/* Primary Arena: 60/40 Split Architecture */}
      <div className="flex-1 mx-auto px-gutter-desktop py-space-lg w-full max-w-container-max">
        <div className="items-start gap-space-lg grid grid-cols-12">
          {/* LEFT 60%: Cafeteria Champions Leaderboard */}
          <section className="flex flex-col gap-space-md col-span-12 lg:col-span-7">
            {/* Section Header Bar */}
            <div className="flex justify-between items-center bg-surface-container px-space-md py-space-sm rounded-2xl">
              <div className="flex items-center gap-space-xs">
                <span className="text-headline-sm text-surface-tint material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  military_tech
                </span>
                <h2 className="font-headline-md font-black text-headline-md text-on-surface uppercase tracking-tight">
                  Today's Champions
                </h2>
              </div>
              <div className="flex items-center gap-space-2xs bg-surface-container-lowest shadow-sm px-space-xs py-space-2xs rounded-full">
                <span className="bg-secondary-container rounded-full w-2 h-2 animate-pulse"></span>
                <span className="font-label-sm font-bold text-label-sm text-secondary uppercase">Campus Loyalty Tier</span>
              </div>
            </div>

            {/* Grand Podium Mosaic (Top 3) */}
            {hasEnoughUsers ? (
            <div className="items-end gap-space-sm grid grid-cols-1 md:grid-cols-3 pt-space-xs">
              {/* 🥈 #2 Silver Podium Card */}
              {rank2User && (
              <div className="relative flex flex-col items-center order-2 md:order-1 bg-surface-container-lowest shadow-md p-space-md border border-surface-container/60 rounded-2xl overflow-hidden text-center">
                <div className="-top-10 -right-10 absolute bg-surface-variant/40 blur-xl rounded-full w-24 h-24"></div>
                <div className="flex justify-center items-center bg-surface-container-high shadow-sm mb-space-xs rounded-full w-10 h-10 font-headline-sm font-bold text-headline-sm text-on-surface">
                  🥈 2
                </div>
                <div className="bg-gradient-to-tr from-surface-variant via-surface-container-highest to-surface-bright mb-space-xs p-1 rounded-full w-16 h-16 overflow-hidden">
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
                  {rank2User.department || 'Campus Student'}
                </span>
                <div className="bg-surface-container-low mt-space-sm px-space-md py-space-xs rounded-full w-full">
                  <span className="font-title-lg font-bold text-on-surface text-title-lg">₹{rank2User.spend}</span>
                  <span className="ml-1 font-body-sm text-body-sm text-on-surface-variant">spent</span>
                </div>
                <div className="flex items-center gap-1 mt-space-xs font-label-sm font-bold text-label-sm text-secondary">
                  <span className="text-sm material-symbols-outlined">trending_up</span> +{rank2User.points} pts
                </div>
              </div>
              )}

              {/* 🥇 #1 Champion Podium Card (Central, Crowned) */}
              {rank1User && (
              <div className={`relative flex flex-col items-center order-1 md:order-2 bg-surface-container-lowest shadow-xl -mt-space-sm p-space-lg border-2 border-primary-container rounded-2xl overflow-hidden text-center ${
                !rank2User ? 'md:col-start-2' : ''
              }`}>
                <div className="top-0 absolute inset-x-0 bg-gradient-to-r from-surface-tint via-primary-container to-surface-tint h-2"></div>
                <div className="-top-12 left-1/2 absolute bg-primary-container/20 blur-2xl rounded-full w-32 h-32 -translate-x-1/2 pointer-events-none"></div>

                <div className="flex items-center gap-space-2xs bg-primary-container shadow-sm mb-space-xs px-space-sm py-space-2xs rounded-full text-on-primary-container">
                  <span className="text-sm material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>crown</span>
                  <span className="font-label-md font-extrabold text-label-md uppercase tracking-wider">NEW LEADER!</span>
                </div>

                <div className="flex justify-center items-center bg-primary-container shadow-md mb-space-xs rounded-full w-12 h-12 font-headline-md font-extrabold text-headline-md text-on-primary-container">
                  🥇 1
                </div>

                <div className="bg-gradient-to-tr from-primary via-primary-container to-secondary-container shadow-md mb-space-xs p-1 rounded-full w-20 h-20 overflow-hidden">
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
                  {rank1User.department || 'Campus Student'}
                </span>

                <div className="bg-primary/10 mt-space-sm px-space-lg py-space-xs rounded-2xl w-full">
                  <div className="py-1 font-display-hero-mobile font-black text-display-hero-mobile text-primary leading-none">
                    ₹{rank1User.spend}
                  </div>
                  <span className="font-label-sm font-bold text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Total Cafeteria Tabs Today
                  </span>
                </div>

                <div className="flex items-center gap-space-xs mt-space-sm">
                  <span className="flex items-center gap-1 bg-secondary-container px-space-xs py-space-2xs rounded-full font-label-sm font-bold text-label-sm text-on-secondary-container">
                    <span className="text-xs material-symbols-outlined">verified</span> VIP Lounge Access
                  </span>
                  <span className="bg-surface-container-high px-space-xs py-space-2xs rounded-full font-label-sm font-bold text-label-sm text-on-surface">
                    +{rank1User.points} Coins
                  </span>
                </div>
              </div>
              )}

              {/* 🥉 #3 Bronze Podium Card */}
              {rank3User && (
              <div className="relative flex flex-col items-center order-3 bg-surface-container-lowest shadow-md p-space-md border border-surface-container/60 rounded-2xl overflow-hidden text-center">
                <div className="-top-10 -left-10 bg-primary-fixed-dim/30 absolute blur-xl rounded-full w-24 h-24"></div>
                <div className="flex justify-center items-center bg-surface-container-high shadow-sm mb-space-xs rounded-full w-10 h-10 font-headline-sm font-bold text-headline-sm text-on-surface">
                  🥉 3
                </div>
                <div className="bg-gradient-to-tr to-surface-bright mb-space-xs p-1 rounded-full from-outline via-outline-variant w-16 h-16 overflow-hidden">
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
                  {rank3User.department || 'Campus Student'}
                </span>
                <div className="bg-surface-container-low mt-space-sm px-space-md py-space-xs rounded-full w-full">
                  <span className="font-title-lg font-bold text-on-surface text-title-lg">₹{rank3User.spend}</span>
                  <span className="ml-1 font-body-sm text-body-sm text-on-surface-variant">spent</span>
                </div>
                <div className="flex items-center gap-1 mt-space-xs font-label-sm font-bold text-label-sm text-secondary">
                  <span className="text-sm material-symbols-outlined">trending_up</span> +{rank3User.points} pts
                </div>
              </div>
              )}
            </div>
            ) : (
              <div className="flex flex-col justify-center items-center gap-space-md bg-surface-container-low p-space-2xl rounded-3xl text-center">
                <div className="text-6xl">🏆</div>
                <h3 className="font-headline-md font-bold text-headline-md text-on-surface">
                  No Rankings Yet
                </h3>
                <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
                  Leaderboard will populate as students place orders today
                </p>
              </div>
            )}

            {/* Ranks #4 & #5 List Strip */}
            {remainingUsers.length > 0 && (
            <div className="flex flex-col gap-space-xs">
              {remainingUsers.map((user) => (
              <div key={user.rank} className="flex justify-between items-center bg-surface-container-lowest shadow-sm p-space-sm px-space-md border border-surface-container/60 rounded-2xl">
                <div className="flex items-center gap-space-md min-w-0">
                  <span className="w-8 font-headline-sm font-extrabold text-headline-sm text-on-surface-variant">
                    {user.rank === 4 ? '4️⃣' : '5️⃣'}
                  </span>
                  <div className="flex-shrink-0 bg-surface-variant rounded-full w-10 h-10 overflow-hidden">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-title-lg font-bold text-on-surface text-title-lg truncate">
                      {user.name}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {user.department} • {user.ordersCount} orders today
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="font-headline-sm font-bold text-headline-sm text-on-surface">₹{user.spend}</span>
                  <span className="block font-label-sm font-semibold text-label-sm text-secondary">{user.points} pts</span>
                </div>
              </div>
              ))}
            </div>
            )}

            {/* Automated Reset Callout Footer */}
            <div className="flex justify-between items-center bg-surface-container-low px-space-md py-space-xs border border-surface-container rounded-xl font-body-sm text-body-sm text-on-surface-variant">
              <div className="flex items-center gap-space-xs">
                <span className="text-sm material-symbols-outlined">info</span>
                <span>Daily spending resets automatically at 11:59 PM IST</span>
              </div>
              <span className="font-label-sm font-bold text-label-sm text-primary uppercase">
                Top 3 Earn Free Meal Vouchers
              </span>
            </div>
          </section>

          {/* RIGHT 40%: Live Kitchen Pickup Queue */}
          <section className="flex flex-col gap-space-md col-span-12 lg:col-span-5">
            {/* Queue Header */}
            <div className="flex justify-between items-center bg-surface-container px-space-md py-space-sm rounded-2xl">
              <div className="flex items-center gap-space-xs">
                <span className="text-headline-sm text-secondary material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  restaurant_menu
                </span>
                <h2 className="font-headline-md font-black text-headline-md text-on-surface uppercase tracking-tight">
                  Kitchen Pickup Queue
                </h2>
              </div>
              <span className="bg-secondary px-space-xs py-space-2xs rounded-full font-label-sm font-bold text-label-sm text-on-secondary">
                FAST FLOW
              </span>
            </div>

            {/* ZONE 1: READY FOR PICKUP */}
            <div className="flex flex-col gap-space-sm bg-surface-container-lowest shadow-lg p-space-md border-2 border-secondary rounded-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-space-xs">
                  <span className="bg-secondary rounded-full w-3 h-3 animate-ping"></span>
                  <span className="font-headline-sm font-black text-headline-sm text-secondary uppercase tracking-tight">
                    READY FOR PICKUP
                  </span>
                </div>
                <span className="bg-secondary-container px-space-xs py-space-2xs rounded-lg font-label-md font-bold text-label-md text-on-secondary-container">
                  Counter 1 &amp; 2
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Please show your digital QR or token from your JECRC student portal
              </p>

              {/* Giant Glowing Ready Token Badges */}
              {readyTickets.length > 0 ? (
                <div className="gap-space-sm grid grid-cols-3 py-space-xs">
                  {readyTickets.slice(0, 3).map((t, idx) => (
                    <div
                      key={idx}
                      className="group relative flex flex-col justify-center items-center bg-secondary shadow-lg p-space-sm rounded-2xl overflow-hidden text-on-secondary hover:scale-105 transition-transform duration-200 transform"
                    >
                      <span className="opacity-80 font-label-sm font-bold text-label-sm uppercase">TOKEN</span>
                      <span className="my-space-2xs font-display-hero font-black text-display-hero leading-none">
                        {t.tokenNumber}
                      </span>
                      <span className="bg-on-secondary/20 px-space-xs py-space-2xs rounded-full font-label-sm font-semibold text-label-sm uppercase tracking-wider">
                        {t.station || 'Counter 1'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-space-md text-center font-body-sm text-body-sm text-on-surface-variant">
                  No orders currently waiting for pickup
                </div>
              )}

              {/* Notice */}
              <div className="flex items-center gap-space-xs bg-surface-container-high px-space-sm py-space-xs rounded-xl font-label-md text-label-md text-on-surface">
                <span className="text-secondary text-base animate-pulse material-symbols-outlined">volume_up</span>
                <span>Chime rings when your token is called. Trays held for 7 minutes.</span>
              </div>
            </div>

            {/* ZONE 2: NOW PREPARING */}
            <div className="flex flex-col gap-space-sm bg-surface-container-lowest shadow-sm p-space-md border border-surface-container/60 rounded-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-space-xs">
                  <span className="text-headline-sm text-surface-tint animate-spin material-symbols-outlined">sync</span>
                  <span className="font-headline-sm font-bold text-headline-sm text-on-surface uppercase tracking-tight">
                    Now Preparing
                  </span>
                </div>
                <span className="font-body-sm font-semibold text-body-sm text-on-surface-variant">
                  Avg. Prep: ~4 mins
                </span>
              </div>

              {/* Preparing Tokens Grid */}
              {preparingTickets.length > 0 ? (
                <div className="gap-space-sm grid grid-cols-2">
                  {preparingTickets.slice(0, 4).map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-surface-container-low shadow-sm p-space-sm rounded-2xl">
                      <div>
                        <div className="flex items-center gap-space-2xs">
                          <span className="font-headline-md font-extrabold text-headline-md text-on-surface">{t.tokenNumber}</span>
                          <span className="bg-primary/10 px-space-2xs py-0.5 rounded font-label-sm font-bold text-label-sm text-primary">
                            {t.station || 'Kitchen'}
                          </span>
                        </div>
                        <p className="max-w-[120px] font-title-md font-semibold text-on-surface text-title-md truncate">
                          {t.customerName}
                        </p>
                        <p className="max-w-[130px] font-body-sm text-body-sm text-on-surface-variant truncate">
                          {t.items?.[0]?.name || 'Cafeteria Order'}
                        </p>
                      </div>
                      <div className="flex justify-center items-center bg-surface-container-high rounded-full w-10 h-10 text-primary">
                        <span className="text-base material-symbols-outlined">skillet</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-space-md text-center font-body-sm text-body-sm text-on-surface-variant">
                  Kitchen is clear • Ready for new orders
                </div>
              )}
            </div>

            {/* Quick Scan Promo QR Panel for TV Audiences */}
            <div className="flex justify-between items-center bg-gradient-to-r from-surface-container-high to-surface-container-highest p-space-md border border-surface-container rounded-2xl">
              <div className="flex flex-col">
                <span className="font-label-sm font-extrabold text-label-sm text-primary uppercase tracking-wider">
                  Skip the line
                </span>
                <h3 className="font-title-lg font-bold text-on-surface text-title-lg">Order from your seat</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Scan QR to order directly on your mobile browser
                </p>
              </div>
              <div className="flex justify-center items-center bg-surface-container-lowest shadow-sm p-2 rounded-xl">
                <svg className="w-14 h-14 text-on-surface" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm8-2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm2-4h2v2h-2v-2zm0 4h2v4h-2v-4zm-6 2h4v2h-4v-2zm10-2h2v4h-2v-4zM5 5h2v2H5V5zm12 0h2v2h-2V5zM5 17h2v2H5v-2z"></path>
                </svg>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* TV Hallway Continuous Bottom Ticker Bar */}
      <footer className="relative bg-on-surface shadow-xl mt-auto px-gutter-desktop py-space-sm w-full overflow-hidden text-surface-bright">
        <div className="flex items-center">
          <div className="z-10 flex flex-shrink-0 items-center gap-space-xs bg-primary shadow-md mr-space-md px-space-sm py-space-2xs rounded-full font-label-md font-extrabold text-label-md text-on-primary uppercase tracking-wider">
            <span className="text-base material-symbols-outlined">campaign</span>
            <span>CAMPUS LIVE DISPATCH</span>
          </div>
          <div className="flex-1 overflow-hidden whitespace-nowrap">
            <div className="font-medium text-surface-bright/90 text-sm animate-ticker">
              <span>🔔 Token #40 ready at Counter 1</span>
              <span className="mx-4 text-outline-variant">•</span>
              <span>🔥 Paneer Tikka Burger trending #1 today with 84 trays served</span>
              <span className="mx-4 text-outline-variant">•</span>
              <span>⚡ Average kitchen wait time: 8 mins across all North Hall stalls</span>
              <span className="mx-4 text-outline-variant">•</span>
              <span>⭐ Cafeteria Plus members enjoy priority pickup slots during 12:30 - 13:30 rush</span>
              <span className="mx-4 text-outline-variant">•</span>
              <span>🪙 Daily leaderboard resets at 11:59 PM IST</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
