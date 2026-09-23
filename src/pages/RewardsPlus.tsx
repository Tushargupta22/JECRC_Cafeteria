import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import { LeaderboardUser } from '../data/mockData';
import { leaderboardApi, subscriptionApi, loyaltyApi, SubscriptionPlan, LoyaltyTransaction } from '../services/api';

export const RewardsPlus: React.FC = () => {
  const { student, user, redeemReward, redeemedVouchers, refreshUser, isAuthenticated, openAuthModal, openEditProfileModal } = useStudent();
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>([]);  // Empty by default, no fake data
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  // Fetch real data from backend
  useEffect(() => {
    const fetchData = () => {
      // 1. Leaderboard - FIXED: Only show real users from database
      leaderboardApi.getLeaderboard('daily').then(res => {
        if (res && res.leaderboard) {
          const mapped: LeaderboardUser[] = res.leaderboard.map(u => ({
            rank: u.rank,
            name: u.name,
            shortName: u.shortName || u.name.split(' ')[0],
            department: u.department || 'B.Tech CS',
            spend: u.spend,
            points: u.points,
            ordersCount: u.ordersCount,
            avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
            isCurrentUser: u.isCurrentUser || (user ? (u.userId === user._id || u.name === user.name) : false)
          }));
          setLeaderboardUsers(mapped);
        } else {
          // If no users, show empty array (not mock data)
          setLeaderboardUsers([]);
        }
      }).catch(() => {
        // On error, show empty array (not mock data)
        setLeaderboardUsers([]);
      });

      // 2. Subscription plans
      subscriptionApi.getPlans().then(res => {
        if (res && res.plans) {
          setPlans(res.plans);
        }
      }).catch(() => {});

      // 3. Loyalty Transactions
      if (isAuthenticated) {
        loyaltyApi.getTransactions().then(res => {
          if (res && res.transactions) {
            setTransactions(res.transactions);
          }
        }).catch(() => {});
      }
    };

    // Initial fetch
    fetchData();

    // Auto-refresh leaderboard every 15 seconds
    const refreshInterval = setInterval(() => {
      leaderboardApi.getLeaderboard('daily').then(res => {
        if (res && res.leaderboard) {
          const mapped: LeaderboardUser[] = res.leaderboard.map(u => ({
            rank: u.rank,
            name: u.name,
            shortName: u.shortName || u.name.split(' ')[0],
            department: u.department || 'B.Tech CS',
            spend: u.spend,
            points: u.points,
            ordersCount: u.ordersCount,
            avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
            isCurrentUser: u.isCurrentUser || (user ? (u.userId === user._id || u.name === user.name) : false)
          }));
          setLeaderboardUsers(mapped);
        } else {
          setLeaderboardUsers([]);
        }
      }).catch(() => {
        setLeaderboardUsers([]);
      });
    }, 15000);

    return () => clearInterval(refreshInterval);
  }, [user, isAuthenticated]);

  const handleRedeem = (cost: number, title: string) => {
    redeemReward(cost, title);
  };

  const handleSubscribe = async (planKey: string) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setSubscribing(planKey);
    try {
      // Find the plan details to get the correct discount percentage
      const selectedPlan = plans.find(p => 
        p.name === planKey || 
        p.id === planKey || 
        p.plan === planKey ||
        (p.name || '').toLowerCase().includes(planKey.toLowerCase()) ||
        (p.id || '').toLowerCase().includes(planKey.toLowerCase())
      );
      
      const response = await subscriptionApi.subscribe(planKey);
      await refreshUser();
      
      // Use the discount percentage from the plan or response
      const discountPercent = selectedPlan?.discountPercentage || response?.subscription?.discountPercentage || 10;
      alert(`🎉 Congratulations! Your ${selectedPlan?.name || 'Cafeteria Plus'} membership is now active. ${discountPercent}% discount will automatically apply at checkout!`);
    } catch (err: any) {
      alert(err.message || 'Subscription failed');
    } finally {
      setSubscribing(null);
    }
  };

  // FIXED: Properly construct podium with users in correct positions
  // Podium visual layout: [2nd, 1st, 3rd] but only show users that actually exist
  const rank1User = leaderboardUsers.find(u => u.rank === 1);
  const rank2User = leaderboardUsers.find(u => u.rank === 2);
  const rank3User = leaderboardUsers.find(u => u.rank === 3);

  const hasEnoughUsers = Boolean(rank1User || rank2User || rank3User);

  return (
    <div className="bg-surface w-full min-h-screen">
      <div className="space-y-space-2xl mx-auto px-gutter-desktop py-space-xl w-full max-w-container-max">
        {/* Header Hero Banner */}
        <div className="flex md:flex-row flex-col justify-between items-center gap-space-md bg-gradient-to-r from-tertiary/15 via-primary-container/10 to-secondary-container/15 p-space-lg border border-surface-container/60 rounded-3xl">
          <div>
            <div className="flex items-center gap-space-xs mb-1">
              <span className={`px-space-xs py-0.5 rounded-full font-label-sm text-label-sm font-bold ${
                student.isPlusMember
                  ? 'bg-primary-container text-on-primary'
                  : 'bg-surface-container text-on-surface'
              }`}>
                {student.isPlusMember ? '⭐ Cafeteria Plus Active' : 'Standard Plan'}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {student.isPlusMember ? `Membership Valid till ${student.plusExpiry}` : 'Upgrade for 10% OFF all meals'}
              </span>
            </div>
            <h1 className="font-headline-lg font-bold text-headline-lg text-on-surface">
              Campus Wallet &amp; Rewards
            </h1>
            <p className="max-w-xl font-body-md text-body-md text-on-surface-variant">
              Earn 1 loyalty coin per ₹10 spent, climb daily food leaderboards, and enjoy exclusive 10% discounts across all university dining counters.
            </p>
          </div>
          {isAuthenticated ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md">
              <div className="flex items-center gap-space-sm bg-surface-container-lowest shadow-sm px-space-md py-space-sm border border-surface-container/60 rounded-2xl">
                <img
                  src={student.avatar}
                  alt={student.name}
                  className="w-12 h-12 rounded-full object-cover border border-surface-container shadow-sm flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-title-md font-bold text-on-surface truncate">{student.name}</div>
                  <div className="font-body-sm text-xs text-on-surface-variant truncate">
                    {student.department} • {student.year}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openEditProfileModal}
                  className="ml-2 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold border border-surface-container flex items-center gap-1 cursor-pointer transition-colors"
                  title="Edit Profile"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>Edit</span>
                </button>
              </div>

              <div className="flex items-center gap-space-md bg-surface-container-lowest shadow-sm px-space-lg py-space-md border border-surface-container/60 rounded-2xl">
                <span className="text-3xl">🪙</span>
                <div>
                  <span className="font-label-sm font-bold text-label-sm text-on-surface-variant uppercase">Available Coins</span>
                  <div className="mt-0.5 font-headline-lg font-black text-headline-lg text-primary leading-none">
                    {student.points} <span className="font-label-md font-bold text-label-md text-on-surface-variant">PTS</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('login', 'student')}
              className="flex items-center gap-2 bg-primary-container shadow-md hover:shadow-lg px-space-lg py-space-md rounded-2xl font-label-md font-bold text-label-md text-on-primary transition-all cursor-pointer"
            >
              <span className="text-xl material-symbols-outlined">login</span>
              <span>Sign In for Rewards</span>
            </button>
          )}
        </div>

        {/* 12-Column Layout */}
        <div className="items-start gap-space-lg grid grid-cols-1 lg:grid-cols-12">
          {/* Left 5 Columns: Wallet, Voucher, and Badges */}
          <div className="flex flex-col gap-space-lg lg:col-span-5">
            {/* Campus Wallet Card */}
            <div className="relative flex flex-col gap-space-md bg-surface-container-lowest shadow-md p-space-lg border border-surface-container/60 rounded-3xl overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-sm font-bold text-headline-sm text-on-surface">Campus Wallet</span>
                    {student.isPlusMember && (
                      <span className="bg-secondary-container px-space-xs py-0.5 rounded-full font-label-sm font-bold text-label-sm text-on-secondary-container">
                        ⭐ Plus Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                    ₹10 spent = 1 loyalty coin awarded on completed orders
                  </p>
                </div>
                <div className="flex items-center gap-space-2xs bg-surface-container px-space-sm py-space-xs rounded-full">
                  <span className="text-xl">🪙</span>
                  <span className="font-headline-md font-black text-headline-md text-primary">
                    {student.points}
                  </span>
                  <span className="font-label-sm font-bold text-label-sm text-on-surface-variant">PTS</span>
                </div>
              </div>

              {/* Milestone Progress */}
              <div className="space-y-space-xs bg-surface-container-low p-space-md rounded-2xl">
                <div className="flex justify-between items-baseline">
                  <span className="font-label-md font-semibold text-label-md text-on-surface">
                    Voucher Milestone Progress
                  </span>
                  <span className="font-label-sm font-bold text-label-sm text-primary">
                    {student.points} / 500 points
                  </span>
                </div>
                <div className="relative bg-surface-container-highest rounded-full w-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary-container to-primary rounded-full h-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, (student.points / 500) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center pt-1 font-body-sm text-body-sm text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="text-primary text-sm material-symbols-outlined">flag</span>
                    {student.points >= 500
                      ? 'Goal reached! Claim your voucher below.'
                      : `Only ${Math.max(0, 500 - student.points)} points away from ₹50 Instant Voucher`}
                  </span>
                  <span className="font-bold text-on-surface">
                    {Math.round(Math.min(100, (student.points / 500) * 100))}%
                  </span>
                </div>
              </div>

              {/* Streak Card */}
              <div className="flex items-center gap-space-sm bg-gradient-to-r from-primary-container/10 via-surface-container to-secondary-container/10 p-space-md rounded-2xl">
                <div className="flex justify-center items-center bg-primary-container shadow-sm rounded-full w-10 h-10 text-on-primary shrink-0">
                  <span className="text-lg material-symbols-outlined">local_fire_department</span>
                </div>
                <div>
                  <div className="font-title-md font-bold text-on-surface text-title-md">
                    {student.orderStreakDays}-Day Order Streak! 🔥
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Total university orders: {student.ordersCount} meals completed
                  </p>
                </div>
              </div>
            </div>

            {/* Dining Club Subscription Plans */}
            {plans.length > 0 && (
              <div className="space-y-space-md bg-surface-container-lowest shadow-md p-space-lg border border-surface-container/60 rounded-3xl">
                <div className="flex justify-between items-center">
                  <div className="font-headline-sm font-bold text-headline-sm text-on-surface">
                    Dining Club Membership
                  </div>
                  <span className="font-label-sm font-bold text-label-sm text-primary">
                    10% OFF Every Meal
                  </span>
                </div>
                <div className="space-y-space-sm">
                  {plans.map(plan => {
                    const planKey = plan.name || plan.id || plan.plan || '';
                    const isSemester = plan.name?.toLowerCase().includes('semester') || plan.id?.includes('semester') || plan.plan === 'plus_semester';
                    return (
                      <div
                        key={plan.id || plan.name || plan.plan}
                        className="flex justify-between items-center gap-space-sm bg-surface-container-low p-space-md border border-surface-container/60 hover:border-primary/40 rounded-2xl transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-title-md font-bold text-on-surface text-title-md">
                            <span>{plan.name}</span>
                            {isSemester && (
                              <span className="bg-primary-container px-2 py-0.2 rounded-full font-bold text-[10px] text-on-primary">
                                BEST VALUE
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
                            {plan.description}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-headline-sm font-black text-headline-sm text-on-surface">
                            ₹{plan.price}
                          </div>
                          <button
                            onClick={() => handleSubscribe(planKey)}
                            disabled={subscribing === planKey}
                            className="bg-primary-container disabled:opacity-60 hover:shadow-sm mt-1 px-3 py-1 rounded-full font-label-sm font-bold text-label-sm text-on-primary transition-all cursor-pointer"
                          >
                            {subscribing === planKey ? 'Activating...' : student.isPlusMember ? 'Renew' : 'Join Plus'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Redeem Rewards Catalog */}
            <div className="space-y-space-md bg-surface-container-lowest shadow-md p-space-lg border border-surface-container/60 rounded-3xl">
              <div className="flex justify-between items-center">
                <div className="font-headline-sm font-bold text-headline-sm text-on-surface">Redeem Rewards</div>
                <span className="font-label-sm font-semibold text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Available Perks
                </span>
              </div>

              <div className="space-y-space-sm">
                {/* Perk 1: ₹50 Voucher */}
                <div className="flex justify-between items-center gap-space-sm bg-surface-container-low hover:bg-surface-container p-space-md rounded-2xl transition-all">
                  <div className="flex items-center gap-space-sm">
                    <div className="flex justify-center items-center bg-primary-container/15 rounded-xl w-12 h-12 text-primary shrink-0">
                      <span className="text-2xl material-symbols-outlined">confirmation_number</span>
                    </div>
                    <div>
                      <div className="font-title-md font-bold text-on-surface text-title-md">₹50 OFF Coupon (JECRC50)</div>
                      <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
                        <span>Valid on orders &gt; ₹100</span>
                        <span>•</span>
                        <span className="font-bold text-primary">500 pts</span>
                      </div>
                    </div>
                  </div>
                  {redeemedVouchers.includes('₹50 OFF Coupon') ? (
                    <span className="bg-secondary px-space-md py-space-xs rounded-full font-label-md font-bold text-label-md text-on-secondary">
                      Claimed!
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRedeem(500, '₹50 OFF Coupon')}
                      className="bg-primary-container hover:opacity-90 shadow-sm px-space-md py-space-xs rounded-full font-label-md font-bold text-label-md text-on-primary active:scale-95 transition-transform cursor-pointer shrink-0"
                    >
                      Redeem
                    </button>
                  )}
                </div>

                {/* Perk 2: Free Artisan Beverage */}
                <div className="flex justify-between items-center gap-space-sm bg-surface-container-low/60 opacity-85 p-space-md rounded-2xl">
                  <div className="flex items-center gap-space-sm">
                    <div className="flex justify-center items-center bg-surface-container-highest rounded-xl w-12 h-12 text-on-surface-variant shrink-0">
                      <span className="text-2xl material-symbols-outlined">local_cafe</span>
                    </div>
                    <div>
                      <div className="font-title-md font-bold text-on-surface text-title-md">Free Artisan Cold Coffee</div>
                      <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
                        <span>Hazelnut / Mocha</span>
                        <span>•</span>
                        <span className="font-bold">1,000 pts</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-highest px-space-sm py-1 rounded-full font-label-sm font-semibold text-label-sm text-on-surface-variant shrink-0">
                    <span className="text-xs material-symbols-outlined">lock</span>
                    Need {Math.max(0, 1000 - student.points)} pts
                  </div>
                </div>
              </div>
            </div>

            {/* Campus Badges Unlocked */}
            <div className="space-y-space-md bg-surface-container-lowest shadow-md p-space-lg border border-surface-container/60 rounded-3xl">
              <div className="font-title-lg font-bold text-on-surface text-title-lg">Campus Badges Unlocked</div>
              <div className="gap-space-xs grid grid-cols-3 text-center">
                <div className="flex flex-col items-center gap-1 bg-surface-container-low shadow-sm p-space-sm rounded-2xl">
                  <div className="flex justify-center items-center bg-surface-container-highest rounded-full w-10 h-10 text-xl">
                    ☕
                  </div>
                  <span className="font-label-sm font-bold text-label-sm text-on-surface line-clamp-1">Coffee Aficionado</span>
                  <span className="font-body-sm text-[10px] text-body-sm text-on-surface-variant">Cold Brew Regular</span>
                </div>

                <div className="flex flex-col items-center gap-1 bg-surface-container-low shadow-sm p-space-sm rounded-2xl">
                  <div className="flex justify-center items-center bg-surface-container-highest rounded-full w-10 h-10 text-xl">
                    🏆
                  </div>
                  <span className="font-label-sm font-bold text-label-sm text-on-surface line-clamp-1">
                    {student.dailyRank > 0 ? `Campus Rank #${student.dailyRank}` : 'Unranked'}
                  </span>
                  <span className="font-body-sm text-[10px] text-body-sm text-on-surface-variant">
                    {student.dailyRank === 1 ? 'Active Leader' : student.dailyRank > 0 ? 'Top Contender' : 'Order to Rank'}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 bg-surface-container-low shadow-sm p-space-sm rounded-2xl">
                  <div className="flex justify-center items-center bg-surface-container-highest rounded-full w-10 h-10 text-xl">
                    ⭐
                  </div>
                  <span className="font-label-sm font-bold text-label-sm text-on-surface line-clamp-1">Plus Member</span>
                  <span className="font-body-sm text-[10px] text-body-sm text-on-surface-variant">Dining Club VIP</span>
                </div>
              </div>
            </div>

            {/* Points Activity Ledger */}
            {transactions.length > 0 && (
              <div className="space-y-space-sm bg-surface-container-lowest shadow-md p-space-lg border border-surface-container/60 rounded-3xl">
                <div className="flex justify-between items-center font-title-lg font-bold text-on-surface text-title-lg">
                  <span>Recent Points Ledger</span>
                  <span className="font-bold text-primary text-xs">{transactions.length} events</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transactions.slice(0, 5).map(t => (
                    <div key={t._id} className="flex justify-between items-center bg-surface-container-low p-2 rounded-xl text-xs">
                      <div>
                        <div className="font-bold text-on-surface">{t.reason}</div>
                        <div className="text-[10px] text-on-surface-variant">{new Date(t.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span className={`font-bold ${t.type === 'earned' ? 'text-primary' : 'text-error'}`}>
                        {t.type === 'earned' ? '+' : '-'}{t.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 7 Columns: Today's Top Spenders Podium & Full Standings */}
          <div className="flex flex-col gap-space-lg lg:col-span-7">
            <div className="relative bg-surface-container-lowest shadow-md p-space-lg md:p-space-xl border border-surface-container/60 rounded-3xl overflow-hidden">
              <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-space-xs mb-space-lg">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="text-2xl">🏆</span>
                    <h2 className="font-headline-md font-bold text-headline-md text-on-surface">
                      Today's Top Spenders
                    </h2>
                  </div>
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                    Calculated live from MongoDB order completions
                  </p>
                </div>
                <div className="flex items-center self-start sm:self-auto gap-space-xs bg-surface-container-low px-space-sm py-1 rounded-full">
                  <span className="inline-block bg-secondary rounded-full w-2 h-2"></span>
                  <span className="font-label-sm font-semibold text-label-sm text-on-surface-variant">
                    Live Standings
                  </span>
                </div>
              </div>

              {/* Top 3 Podium Cards - Only show if we have enough users */}
              {hasEnoughUsers ? (
              <div className="items-end gap-space-xs sm:gap-space-sm grid grid-cols-3 mb-space-xl pt-space-md">
                {/* 🥈 #2 Silver */}
                {rank2User && (
                <div className="relative flex flex-col items-center bg-surface-container-low p-space-sm sm:p-space-md rounded-2xl text-center">
                  <div className="flex justify-center items-center bg-surface-container-highest shadow-sm mb-space-2xs rounded-full w-8 h-8 font-bold text-on-surface text-sm">
                    🥈
                  </div>
                  <img
                    src={rank2User.avatar}
                    alt={rank2User.name}
                    className="shadow-md mb-space-2xs rounded-full w-12 sm:w-14 h-12 sm:h-14 object-cover"
                  />
                  <span className="max-w-full font-title-md font-bold text-on-surface text-title-md truncate">
                    {rank2User.shortName}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">{rank2User.department}</span>
                  <span className="mt-space-xs font-headline-sm font-black text-headline-sm text-on-surface">
                    ₹{rank2User.spend}
                  </span>
                  <span className="mt-1 font-label-sm text-label-sm text-on-surface-variant">Rank #2</span>
                </div>
                )}

                {/* 👑 🥇 #1 Gold Champion */}
                {rank1User && (
                <div className={`relative flex flex-col items-center bg-gradient-to-b from-primary-container/20 to-surface-container-low shadow-lg -mt-4 p-space-sm sm:p-space-md border-2 border-primary-container rounded-2xl text-center ${
                  !rank2User ? 'col-start-2' : ''
                }`}>
                  <div className="-top-3 absolute bg-primary-container shadow-md px-space-xs py-0.5 rounded-full font-label-sm font-black text-label-sm text-on-primary uppercase tracking-wide">
                    👑 Leading
                  </div>
                  <div className="flex justify-center items-center bg-primary-container shadow-sm mb-space-2xs rounded-full w-9 h-9 font-bold text-on-primary text-base">
                    🥇
                  </div>
                  <img
                    src={rank1User.avatar}
                    alt={rank1User.name}
                    className="shadow-lg shadow-primary-container/30 mb-space-2xs rounded-full w-14 sm:w-16 h-14 sm:h-16 object-cover"
                  />
                  <div className="flex items-center gap-1">
                    <span className="max-w-full font-title-md font-black text-on-surface text-title-md truncate">
                      {rank1User.name}
                    </span>
                    <span className="text-xs">✨</span>
                  </div>
                  <span className="bg-secondary-container mt-1 px-space-xs py-0.5 rounded-full font-label-sm font-semibold text-label-sm text-on-secondary-container">
                    {rank1User.isCurrentUser ? 'You • Champion' : 'Campus Leader'}
                  </span>
                  <span className="mt-space-xs font-headline-md font-black text-headline-md text-primary">
                    ₹{rank1User.spend}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                    {rank1User.ordersCount} orders this term
                  </span>
                </div>
                )}

                {/* 🥉 #3 Bronze */}
                {rank3User && (
                <div className="relative flex flex-col items-center bg-surface-container-low p-space-sm sm:p-space-md rounded-2xl text-center">
                  <div className="flex justify-center items-center bg-surface-container-highest shadow-sm mb-space-2xs rounded-full w-8 h-8 font-bold text-on-surface text-sm">
                    🥉
                  </div>
                  <img
                    src={rank3User.avatar}
                    alt={rank3User.name}
                    className="shadow-md mb-space-2xs rounded-full w-12 sm:w-14 h-12 sm:h-14 object-cover"
                  />
                  <span className="max-w-full font-title-md font-bold text-on-surface text-title-md truncate">
                    {rank3User.shortName}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">{rank3User.department}</span>
                  <span className="mt-space-xs font-headline-sm font-black text-headline-sm text-on-surface">
                    ₹{rank3User.spend}
                  </span>
                  <span className="mt-1 font-label-sm text-label-sm text-on-surface-variant">Rank #3</span>
                </div>
                )}
              </div>
              ) : (
                <div className="flex flex-col justify-center items-center gap-space-md bg-surface-container-low mb-space-xl p-space-xl rounded-2xl text-center">
                  <div className="text-5xl">🏆</div>
                  <div>
                    <h3 className="font-headline-sm font-bold text-headline-sm text-on-surface">
                      Leaderboard Coming Soon
                    </h3>
                    <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                      Place orders to climb the rankings and earn rewards
                    </p>
                  </div>
                </div>
              )}

              {/* Full Standings List */}
              {leaderboardUsers.length > 0 && (
              <div className="space-y-space-xs">
                <div className="px-space-md py-space-2xs font-label-sm font-semibold text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Full Campus Standings
                </div>
                {leaderboardUsers.map(userItem => (
                  <div
                    key={userItem.rank}
                    className={`p-space-md rounded-2xl flex items-center justify-between shadow-sm transition-colors ${
                      userItem.isCurrentUser
                        ? 'bg-gradient-to-r from-primary-container/15 via-surface-container-low to-surface-container-lowest border border-primary-container/30'
                        : 'bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-space-md">
                      <div className={`font-headline-sm text-headline-sm font-black w-6 text-center ${
                        userItem.rank === 1 ? 'text-primary' : 'text-on-surface-variant'
                      }`}>
                        {userItem.rank}
                      </div>
                      {userItem.avatar ? (
                        <img
                          src={userItem.avatar}
                          alt={userItem.name}
                          className="shadow-sm rounded-full w-10 h-10 object-cover"
                        />
                      ) : (
                        <div className="flex justify-center items-center bg-surface-container-highest rounded-full w-10 h-10 font-bold text-on-surface text-sm">
                          {userItem.initials || 'CB'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-space-2xs">
                          <span className="font-title-md font-bold text-on-surface text-title-md">
                            {userItem.name}
                          </span>
                          {userItem.isCurrentUser && (
                            <span className="bg-primary-container px-space-xs py-0.2 rounded-full font-label-sm font-bold text-label-sm text-on-primary">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {userItem.department} • {userItem.ordersCount} orders
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-headline-sm text-headline-sm font-black ${
                        userItem.rank === 1 ? 'text-primary' : 'text-on-surface font-bold'
                      }`}>
                        ₹{userItem.spend}
                      </div>
                      <span className="font-label-sm font-bold text-label-sm text-secondary">
                        +{userItem.points} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              )}

              {/* Reset Callout Banner */}
              <div className="flex justify-between items-center bg-surface-container mt-space-lg p-space-md rounded-2xl">
                <div className="flex items-center gap-space-xs">
                  <span className="text-primary text-xl material-symbols-outlined">info</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Leaderboard points credited live at midnight to student campus cards.
                  </span>
                </div>
                <Link to="/live-leaderboard" className="font-label-md font-bold text-label-md text-primary hover:underline">
                  View Full Standings →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
