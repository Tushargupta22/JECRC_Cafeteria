import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOwner } from '../../context/OwnerContext';
import {
  ownerApi,
  Deal,
  Reward,
  HighlightSettings,
  OwnerCoupon,
  OwnerDashboardStats
} from '../../services/api';

type TabType = 'overview' | 'highlights' | 'deals' | 'coupons' | 'rewards' | 'appearance' | 'account';

export const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { owner, isOwnerAuthenticated, mustChangePassword, logout, changePassword } = useOwner();

  // Route protection
  useEffect(() => {
    if (!isOwnerAuthenticated) {
      navigate('/owner/login');
    } else if (mustChangePassword) {
      navigate('/owner/change-password');
    }
  }, [isOwnerAuthenticated, mustChangePassword, navigate]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Dashboard Data State
  const [stats, setStats] = useState<OwnerDashboardStats | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [coupons, setCoupons] = useState<OwnerCoupon[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [highlightSettings, setHighlightSettings] = useState<HighlightSettings>({
    overlayEnabled: true,
    overlayIntensity: 'medium',
    heading: "Today's Special Highlights",
    subtitle: "Chef's curated picks with exclusive campus discounts",
    badgeText: "Chef's Special",
    ctaText: "Order Now"
  });

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [dealFormData, setDealFormData] = useState({
    title: '',
    description: '',
    image: '',
    originalPrice: 100,
    discountedPrice: 80,
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    isActive: true,
    showInHighlights: false,
    availableFor: 'both' as 'normal' | 'subscriber' | 'both'
  });

  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<OwnerCoupon | null>(null);
  const [couponFormData, setCouponFormData] = useState({
    couponName: '',
    couponCode: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 15,
    minimumOrderValue: 0,
    maxDiscount: '',
    totalUsageLimit: '',
    perUserUsageLimit: 1,
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    availableFor: 'both' as 'normal' | 'subscriber' | 'both',
    applicableMembershipPlans: [] as string[],
    isActive: true
  });

  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardFormData, setRewardFormData] = useState({
    title: '',
    description: '',
    image: '',
    offerText: '',
    rewardType: 'perk' as 'perk' | 'voucher' | 'free_item' | 'combo',
    pointsCost: 0,
    eligibility: 'All students',
    availableFor: 'both' as 'normal' | 'subscriber' | 'both',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    isActive: true
  });

  // Account Password Form
  const [accountPasswordData, setAccountPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [accountPasswordLoading, setAccountPasswordLoading] = useState(false);

  // Load All Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, dealsRes, couponsRes, rewardsRes, settingsRes] = await Promise.all([
        ownerApi.getDashboardStats().catch(() => ({ stats: null, recentOffers: null })),
        ownerApi.getDeals().catch(() => ({ deals: [] })),
        ownerApi.getCoupons().catch(() => ({ coupons: [] })),
        ownerApi.getRewards().catch(() => ({ rewards: [] })),
        ownerApi.getHighlightSettings().catch(() => ({ settings: null }))
      ]);

      if (dashRes && dashRes.stats) setStats(dashRes.stats);
      if (dealsRes && dealsRes.deals) setDeals(dealsRes.deals);
      if (couponsRes && couponsRes.coupons) setCoupons(couponsRes.coupons);
      if (rewardsRes && rewardsRes.rewards) setRewards(rewardsRes.rewards);
      if (settingsRes && settingsRes.settings) setHighlightSettings(settingsRes.settings);
    } catch {
      showFeedback('error', 'Failed to synchronize with server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwnerAuthenticated) {
      loadData();
    }
  }, [isOwnerAuthenticated]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Image Upload Handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>, target: 'deal' | 'reward') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showFeedback('error', 'Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const uploadRes = await ownerApi.uploadPromoImage(base64);
        if (uploadRes.success && uploadRes.imageUrl) {
          if (target === 'deal') {
            setDealFormData(prev => ({ ...prev, image: uploadRes.imageUrl }));
          } else {
            setRewardFormData(prev => ({ ...prev, image: uploadRes.imageUrl }));
          }
          showFeedback('success', 'Image uploaded successfully!');
        }
      } catch {
        showFeedback('error', 'Image upload failed. Supported formats: JPG, PNG, WebP');
      }
    };
    reader.readAsDataURL(file);
  };

  // ----------------------------------------------------
  // DEALS HANDLERS
  // ----------------------------------------------------
  const openCreateDealModal = () => {
    setEditingDeal(null);
    setDealFormData({
      title: '',
      description: '',
      image: '',
      originalPrice: 100,
      discountedPrice: 80,
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      isActive: true,
      showInHighlights: false,
      availableFor: 'both'
    });
    setDealModalOpen(true);
  };

  const openEditDealModal = (deal: Deal) => {
    setEditingDeal(deal);
    setDealFormData({
      title: deal.title,
      description: deal.description || '',
      image: deal.image || '',
      originalPrice: deal.originalPrice,
      discountedPrice: deal.discountedPrice,
      startDate: new Date(deal.startDate).toISOString().split('T')[0],
      expiryDate: new Date(deal.expiryDate).toISOString().split('T')[0],
      isActive: deal.isActive,
      showInHighlights: deal.showInHighlights,
      availableFor: deal.availableFor
    });
    setDealModalOpen(true);
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dealFormData.discountedPrice >= dealFormData.originalPrice) {
      showFeedback('error', 'Discounted price must be less than original price');
      return;
    }
    try {
      if (editingDeal) {
        await ownerApi.updateDeal(editingDeal._id, dealFormData);
        showFeedback('success', 'Deal updated successfully!');
      } else {
        await ownerApi.createDeal(dealFormData);
        showFeedback('success', 'New deal published successfully!');
      }
      setDealModalOpen(false);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save deal');
    }
  };

  const handleDeleteDeal = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this deal?')) return;
    try {
      await ownerApi.deleteDeal(id);
      showFeedback('success', 'Deal removed successfully');
      loadData();
    } catch {
      showFeedback('error', 'Failed to delete deal');
    }
  };

  const handleToggleDealHighlights = async (deal: Deal) => {
    try {
      await ownerApi.updateDeal(deal._id, { showInHighlights: !deal.showInHighlights });
      showFeedback('success', !deal.showInHighlights ? 'Added to Today’s Highlights' : 'Removed from Highlights');
      loadData();
    } catch {
      showFeedback('error', 'Failed to update highlight status');
    }
  };

  const handleToggleDealActive = async (deal: Deal) => {
    try {
      await ownerApi.updateDeal(deal._id, { isActive: !deal.isActive });
      showFeedback('success', !deal.isActive ? 'Deal activated' : 'Deal deactivated');
      loadData();
    } catch {
      showFeedback('error', 'Failed to toggle deal status');
    }
  };

  // ----------------------------------------------------
  // COUPONS HANDLERS
  // ----------------------------------------------------
  const openCreateCouponModal = () => {
    setEditingCoupon(null);
    setCouponFormData({
      couponName: '',
      couponCode: '',
      description: '',
      discountType: 'percentage',
      discountValue: 15,
      minimumOrderValue: 0,
      maxDiscount: '',
      totalUsageLimit: '',
      perUserUsageLimit: 1,
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      availableFor: 'both',
      applicableMembershipPlans: [],
      isActive: true
    });
    setCouponModalOpen(true);
  };

  const openEditCouponModal = (coupon: OwnerCoupon) => {
    setEditingCoupon(coupon);
    setCouponFormData({
      couponName: coupon.title || '',
      couponCode: coupon.couponCode,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discount,
      minimumOrderValue: coupon.minimumOrder || 0,
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
      totalUsageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      perUserUsageLimit: coupon.perUserLimit || 1,
      startDate: new Date(coupon.validFrom).toISOString().split('T')[0],
      expiryDate: new Date(coupon.validUntil).toISOString().split('T')[0],
      availableFor: coupon.availableFor || 'both',
      applicableMembershipPlans: coupon.applicableMembershipPlans || [],
      isActive: coupon.isActive
    });
    setCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...couponFormData,
        couponCode: couponFormData.couponCode.trim().toUpperCase(),
        discountValue: Number(couponFormData.discountValue),
        minimumOrderValue: Number(couponFormData.minimumOrderValue) || 0,
        maxDiscount: couponFormData.maxDiscount ? Number(couponFormData.maxDiscount) : null,
        totalUsageLimit: couponFormData.totalUsageLimit ? Number(couponFormData.totalUsageLimit) : null,
        perUserUsageLimit: Number(couponFormData.perUserUsageLimit) || 1
      };

      if (editingCoupon) {
        await ownerApi.updateCoupon(editingCoupon._id, payload);
        showFeedback('success', 'Coupon updated successfully!');
      } else {
        await ownerApi.createCoupon(payload);
        showFeedback('success', 'Coupon created successfully!');
      }
      setCouponModalOpen(false);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save coupon');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await ownerApi.deleteCoupon(id);
      showFeedback('success', 'Coupon deleted');
      loadData();
    } catch {
      showFeedback('error', 'Failed to delete coupon');
    }
  };

  // ----------------------------------------------------
  // REWARDS HANDLERS
  // ----------------------------------------------------
  const openCreateRewardModal = () => {
    setEditingReward(null);
    setRewardFormData({
      title: '',
      description: '',
      image: '',
      offerText: '',
      rewardType: 'perk',
      pointsCost: 0,
      eligibility: 'All students',
      availableFor: 'both',
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      isActive: true
    });
    setRewardModalOpen(true);
  };

  const openEditRewardModal = (reward: Reward) => {
    setEditingReward(reward);
    setRewardFormData({
      title: reward.title,
      description: reward.description || '',
      image: reward.image || '',
      offerText: reward.offerText,
      rewardType: reward.rewardType,
      pointsCost: reward.pointsCost || 0,
      eligibility: reward.eligibility || 'All students',
      availableFor: reward.availableFor || 'both',
      startDate: new Date(reward.startDate).toISOString().split('T')[0],
      expiryDate: new Date(reward.expiryDate).toISOString().split('T')[0],
      isActive: reward.isActive
    });
    setRewardModalOpen(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingReward) {
        await ownerApi.updateReward(editingReward._id, rewardFormData);
        showFeedback('success', 'Reward perk updated!');
      } else {
        await ownerApi.createReward(rewardFormData);
        showFeedback('success', 'Reward perk created!');
      }
      setRewardModalOpen(false);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save reward');
    }
  };

  const handleDeleteReward = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this reward?')) return;
    try {
      await ownerApi.deleteReward(id);
      showFeedback('success', 'Reward deleted');
      loadData();
    } catch {
      showFeedback('error', 'Failed to delete reward');
    }
  };

  // ----------------------------------------------------
  // HIGHLIGHT APPEARANCE HANDLER
  // ----------------------------------------------------
  const handleSaveAppearance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ownerApi.updateHighlightSettings(highlightSettings);
      showFeedback('success', 'Highlight appearance settings saved and published live!');
    } catch {
      showFeedback('error', 'Failed to update appearance settings');
    }
  };

  // ----------------------------------------------------
  // ACCOUNT PASSWORD HANDLER
  // ----------------------------------------------------
  const handleAccountPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountPasswordData.newPassword !== accountPasswordData.confirmNewPassword) {
      showFeedback('error', 'New password and confirmation do not match');
      return;
    }
    if (accountPasswordData.newPassword.length < 8) {
      showFeedback('error', 'Password must be at least 8 characters long');
      return;
    }
    setAccountPasswordLoading(true);
    try {
      await changePassword(accountPasswordData);
      setAccountPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      showFeedback('success', 'Password updated successfully!');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update password');
    } finally {
      setAccountPasswordLoading(false);
    }
  };

  // Calculated discount percentage for Deal Form
  const calculatedDiscountPercent = dealFormData.originalPrice > 0 && dealFormData.discountedPrice < dealFormData.originalPrice
    ? Math.round(((dealFormData.originalPrice - dealFormData.discountedPrice) / dealFormData.originalPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      {/* Top Owner Navigation Bar */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md border-b border-surface-container/80 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold shadow-sm">
            <span className="material-symbols-outlined text-xl">storefront</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-on-surface leading-none">JECRC Cafeteria</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                Owner Portal
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Logged in as <strong className="text-on-surface">{owner?.username || 'owner'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            <span>View Public Website</span>
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/owner/login');
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-error/10 text-error hover:bg-error/20 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`fixed top-16 right-4 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-slideDown max-w-md ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span className="material-symbols-outlined text-xl">
            {feedback.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-xs font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Navigation Tabs (Sidebar on Desktop, Horizontal Pills on Mobile) */}
        <nav className="w-full md:w-64 shrink-0 flex md:flex-col overflow-x-auto no-scrollbar gap-1.5 pb-2 md:pb-0">
          {[
            { id: 'overview', label: 'Overview', icon: 'dashboard' },
            { id: 'highlights', label: "Today's Highlights", icon: 'auto_awesome' },
            { id: 'deals', label: 'Deals Management', icon: 'local_offer' },
            { id: 'coupons', label: 'Coupons Management', icon: 'confirmation_number' },
            { id: 'rewards', label: 'Rewards & Perks', icon: 'card_giftcard' },
            { id: 'appearance', label: 'Highlight Appearance', icon: 'palette' },
            { id: 'account', label: 'Account Settings', icon: 'manage_accounts' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`whitespace-nowrap px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-left cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content Panel */}
        <main className="flex-1 min-w-0">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-on-surface-variant">Connecting to MongoDB Atlas...</span>
            </div>
          ) : (
            <>
              {/* 1. OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-on-surface">Owner Dashboard Overview</h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Live promotional analytics and status across the cafeteria website
                    </p>
                  </div>

                  {/* Real Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container/80 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between text-on-surface-variant">
                        <span className="text-xs font-medium">Active Deals</span>
                        <span className="material-symbols-outlined text-primary text-xl">local_offer</span>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-bold text-on-surface">{stats?.totalActiveDeals ?? deals.filter(d => d.isActive).length}</span>
                        <span className="text-[11px] text-on-surface-variant/80 block mt-0.5">Live on menu</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container/80 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between text-on-surface-variant">
                        <span className="text-xs font-medium">Active Coupons</span>
                        <span className="material-symbols-outlined text-emerald-600 text-xl">confirmation_number</span>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-bold text-on-surface">{stats?.totalActiveCoupons ?? coupons.filter(c => c.isActive).length}</span>
                        <span className="text-[11px] text-on-surface-variant/80 block mt-0.5">Redeemable in checkout</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container/80 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between text-on-surface-variant">
                        <span className="text-xs font-medium">Active Rewards</span>
                        <span className="material-symbols-outlined text-amber-600 text-xl">card_giftcard</span>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-bold text-on-surface">{stats?.totalActiveRewards ?? rewards.filter(r => r.isActive).length}</span>
                        <span className="text-[11px] text-on-surface-variant/80 block mt-0.5">In Rewards+ perks catalog</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container/80 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between text-on-surface-variant">
                        <span className="text-xs font-medium">Today's Highlights</span>
                        <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-bold text-on-surface">{stats?.highlightedDeals ?? deals.filter(d => d.showInHighlights && d.isActive).length}</span>
                        <span className="text-[11px] text-on-surface-variant/80 block mt-0.5">Featured on homepage</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={openCreateDealModal}
                      className="px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-sm hover:brightness-105 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      <span>Publish New Deal</span>
                    </button>
                    <button
                      onClick={openCreateCouponModal}
                      className="px-4 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">confirmation_number</span>
                      <span>Create Coupon</span>
                    </button>
                    <button
                      onClick={openCreateRewardModal}
                      className="px-4 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">card_giftcard</span>
                      <span>Add Reward Perk</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('appearance')}
                      className="px-4 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">palette</span>
                      <span>Highlight Appearance</span>
                    </button>
                  </div>

                  {/* Highlights Summary Card */}
                  <div className="p-5 rounded-3xl bg-surface-container-lowest border border-surface-container/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">auto_awesome</span>
                        <h3 className="text-sm font-bold text-on-surface">Currently Highlighted Deals</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('highlights')}
                        className="text-xs text-primary font-bold hover:underline"
                      >
                        Manage Highlights
                      </button>
                    </div>

                    {deals.filter(d => d.showInHighlights && d.isActive).length === 0 ? (
                      <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-2xl border border-dashed border-surface-container">
                        No deals currently set to show in Today's Highlights. Click "Manage Highlights" or edit a deal to feature it!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {deals.filter(d => d.showInHighlights && d.isActive).map(deal => (
                          <div key={deal._id} className="p-3 rounded-2xl bg-surface-container-low border border-surface-container flex items-center gap-3">
                            <img
                              src={deal.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=200'}
                              alt={deal.title}
                              className="w-14 h-14 rounded-xl object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-on-surface truncate">{deal.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-bold text-primary">₹{deal.discountedPrice}</span>
                                <span className="text-[11px] text-on-surface-variant line-through">₹{deal.originalPrice}</span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  {deal.discountPercentage}% OFF
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. TODAY'S HIGHLIGHTS TAB */}
              {activeTab === 'highlights' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-on-surface">Today's Highlights Management</h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Choose which active promotional deals appear in the prime banner section
                      </p>
                    </div>
                    <button
                      onClick={openCreateDealModal}
                      className="px-3.5 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      <span>Add Deal</span>
                    </button>
                  </div>

                  {/* Highlights Grid with Direct Toggle */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deals.map(deal => {
                      const isHighlighted = deal.showInHighlights && deal.isActive;
                      return (
                        <div
                          key={deal._id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                            isHighlighted
                              ? 'bg-primary/5 border-primary/40 shadow-sm'
                              : 'bg-surface-container-lowest border-surface-container/80 opacity-90'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-surface-container">
                              <img
                                src={deal.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=200'}
                                alt={deal.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                {deal.discountPercentage}% OFF
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  deal.availableFor === 'subscriber'
                                    ? 'bg-amber-100 text-amber-800'
                                    : deal.availableFor === 'normal'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {deal.availableFor === 'subscriber' ? 'Members Only' : deal.availableFor === 'normal' ? 'Normal Users' : 'All Users'}
                                </span>
                                {!deal.isActive && (
                                  <span className="text-[10px] font-bold bg-error/10 text-error px-2 py-0.5 rounded">
                                    Inactive
                                  </span>
                                )}
                              </div>

                              <h3 className="text-sm font-bold text-on-surface mt-1 truncate">{deal.title}</h3>
                              <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                                {deal.description || 'Campus special treat'}
                              </p>

                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm font-bold text-primary">₹{deal.discountedPrice}</span>
                                <span className="text-xs text-on-surface-variant line-through">₹{deal.originalPrice}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-surface-container/60 flex items-center justify-between">
                            <button
                              onClick={() => handleToggleDealHighlights(deal)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                deal.showInHighlights
                                  ? 'bg-primary text-on-primary shadow-sm'
                                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {deal.showInHighlights ? 'check_circle' : 'add_circle'}
                              </span>
                              <span>{deal.showInHighlights ? 'Shown in Highlights' : 'Feature in Highlights'}</span>
                            </button>

                            <button
                              onClick={() => openEditDealModal(deal)}
                              className="text-xs text-primary font-bold hover:underline"
                            >
                              Edit Deal
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. DEALS MANAGEMENT TAB */}
              {activeTab === 'deals' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-on-surface">Deals & Discounts</h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Manage meal specials, campus deals, and auto-calculated discount percentages
                      </p>
                    </div>
                    <button
                      onClick={openCreateDealModal}
                      className="px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-sm hover:brightness-105 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      <span>Add New Deal</span>
                    </button>
                  </div>

                  {deals.length === 0 ? (
                    <div className="p-10 rounded-3xl bg-surface-container-lowest border border-surface-container/80 text-center">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">local_offer</span>
                      <h3 className="text-sm font-bold text-on-surface">No promotional deals created yet</h3>
                      <p className="text-xs text-on-surface-variant mt-1 mb-4">Click below to create your first cafeteria deal</p>
                      <button
                        onClick={openCreateDealModal}
                        className="px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold cursor-pointer"
                      >
                        Create First Deal
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {deals.map(deal => (
                        <div
                          key={deal._id}
                          className="rounded-3xl bg-surface-container-lowest border border-surface-container/80 overflow-hidden shadow-sm flex flex-col justify-between"
                        >
                          <div className="relative h-40 w-full overflow-hidden bg-surface-container">
                            <img
                              src={deal.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400'}
                              alt={deal.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                              <span className="bg-primary text-on-primary text-xs font-bold px-2 py-0.5 rounded-lg shadow">
                                {deal.discountPercentage}% OFF
                              </span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg shadow ${
                                deal.availableFor === 'subscriber'
                                  ? 'bg-amber-500 text-white'
                                  : deal.availableFor === 'normal'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-purple-600 text-white'
                              }`}>
                                {deal.availableFor === 'subscriber' ? 'Dining Club' : deal.availableFor === 'normal' ? 'Normal' : 'Everyone'}
                              </span>
                            </div>

                            {deal.showInHighlights && (
                              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow">
                                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                                <span>Highlighted</span>
                              </div>
                            )}
                          </div>

                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-bold text-on-surface truncate">{deal.title}</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  deal.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {deal.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <p className="text-xs text-on-surface-variant line-clamp-2">{deal.description}</p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-base font-bold text-primary">₹{deal.discountedPrice}</span>
                                <span className="text-xs text-on-surface-variant line-through">₹{deal.originalPrice}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleDealActive(deal)}
                                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container text-xs cursor-pointer"
                                  title={deal.isActive ? 'Deactivate' : 'Activate'}
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    {deal.isActive ? 'pause_circle' : 'play_circle'}
                                  </span>
                                </button>
                                <button
                                  onClick={() => openEditDealModal(deal)}
                                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container text-xs cursor-pointer"
                                  title="Edit"
                                >
                                  <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteDeal(deal._id)}
                                  className="p-1.5 rounded-lg text-error hover:bg-error/10 text-xs cursor-pointer"
                                  title="Delete"
                                >
                                  <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. COUPONS MANAGEMENT TAB */}
              {activeTab === 'coupons' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-on-surface">Coupons Management</h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Create promotional codes with discount caps, min spend, and usage limits
                      </p>
                    </div>
                    <button
                      onClick={openCreateCouponModal}
                      className="px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-sm hover:brightness-105 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      <span>Create New Coupon</span>
                    </button>
                  </div>

                  {coupons.length === 0 ? (
                    <div className="p-10 rounded-3xl bg-surface-container-lowest border border-surface-container/80 text-center">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">confirmation_number</span>
                      <h3 className="text-sm font-bold text-on-surface">No promo coupons configured yet</h3>
                      <button
                        onClick={openCreateCouponModal}
                        className="mt-3 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold cursor-pointer"
                      >
                        Create Coupon
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {coupons.map(coupon => (
                        <div
                          key={coupon._id}
                          className="p-5 rounded-3xl bg-surface-container-lowest border border-surface-container/80 shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold tracking-wider px-2.5 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">
                                  {coupon.couponCode}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  coupon.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {coupon.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <span className="text-base font-bold text-on-surface">
                                {coupon.discountType === 'percentage' ? `${coupon.discount}% OFF` : `₹${coupon.discount} FLAT OFF`}
                              </span>
                            </div>

                            <h3 className="text-xs font-bold text-on-surface mt-2.5">{coupon.title}</h3>
                            <p className="text-xs text-on-surface-variant mt-0.5">{coupon.description || 'Special promotion'}</p>

                            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-surface-container text-[11px] text-on-surface-variant">
                              <div>Min Order: <strong className="text-on-surface">₹{coupon.minimumOrder || 0}</strong></div>
                              <div>Max Cap: <strong className="text-on-surface">{coupon.maxDiscount ? `₹${coupon.maxDiscount}` : 'None'}</strong></div>
                              <div>Per User Limit: <strong className="text-on-surface">{coupon.perUserLimit || 1}x</strong></div>
                              <div>Audience: <strong className="text-on-surface">{coupon.availableFor || 'Both'}</strong></div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-surface-container/60 flex items-center justify-between">
                            <span className="text-[10px] text-on-surface-variant">
                              Valid until {new Date(coupon.validUntil).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditCouponModal(coupon)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container text-xs cursor-pointer"
                                title="Edit"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(coupon._id)}
                                className="p-1.5 rounded-lg text-error hover:bg-error/10 text-xs cursor-pointer"
                                title="Delete"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 5. REWARDS & PERKS TAB */}
              {activeTab === 'rewards' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-on-surface">Rewards & Available Perks</h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Manage redeemable loyalty perks and membership rewards shown on the Rewards+ page
                      </p>
                    </div>
                    <button
                      onClick={openCreateRewardModal}
                      className="px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-sm hover:brightness-105 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      <span>Add Reward Perk</span>
                    </button>
                  </div>

                  {rewards.length === 0 ? (
                    <div className="p-10 rounded-3xl bg-surface-container-lowest border border-surface-container/80 text-center">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">card_giftcard</span>
                      <h3 className="text-sm font-bold text-on-surface">No rewards or perks configured yet</h3>
                      <button
                        onClick={openCreateRewardModal}
                        className="mt-3 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold cursor-pointer"
                      >
                        Create Perk
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {rewards.map(reward => (
                        <div
                          key={reward._id}
                          className="p-5 rounded-3xl bg-surface-container-lowest border border-surface-container/80 shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded">
                                {reward.rewardType.replace('_', ' ')}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                reward.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {reward.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            <h3 className="text-sm font-bold text-on-surface">{reward.title}</h3>
                            <p className="text-xs text-primary font-bold mt-1">{reward.offerText}</p>
                            <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{reward.description}</p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
                            <div className="text-xs font-bold text-on-surface flex items-center gap-1">
                              <span className="material-symbols-outlined text-amber-500 text-sm">stars</span>
                              <span>{reward.pointsCost > 0 ? `${reward.pointsCost} Points` : 'Free Perk'}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditRewardModal(reward)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container text-xs cursor-pointer"
                                title="Edit"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteReward(reward._id)}
                                className="p-1.5 rounded-lg text-error hover:bg-error/10 text-xs cursor-pointer"
                                title="Delete"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 6. HIGHLIGHT APPEARANCE TAB */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-on-surface">Highlight Appearance Settings</h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Configure heading text, overlay intensity, and visual styles for Today's Highlights
                    </p>
                  </div>

                  <form onSubmit={handleSaveAppearance} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-6 rounded-3xl bg-surface-container-lowest border border-surface-container/80 shadow-sm space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                          Section Main Heading
                        </label>
                        <input
                          type="text"
                          value={highlightSettings.heading}
                          onChange={(e) => setHighlightSettings({ ...highlightSettings, heading: e.target.value })}
                          required
                          className="w-full px-3.5 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                          Section Subtitle Description
                        </label>
                        <input
                          type="text"
                          value={highlightSettings.subtitle}
                          onChange={(e) => setHighlightSettings({ ...highlightSettings, subtitle: e.target.value })}
                          required
                          className="w-full px-3.5 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                          Badge Tag Text
                        </label>
                        <input
                          type="text"
                          value={highlightSettings.badgeText}
                          onChange={(e) => setHighlightSettings({ ...highlightSettings, badgeText: e.target.value })}
                          required
                          className="w-full px-3.5 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                          CTA Action Button Text
                        </label>
                        <input
                          type="text"
                          value={highlightSettings.ctaText}
                          onChange={(e) => setHighlightSettings({ ...highlightSettings, ctaText: e.target.value })}
                          required
                          className="w-full px-3.5 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                          Gradient Overlay Intensity
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['light', 'medium', 'dark', 'strong'] as const).map(intensity => (
                            <button
                              key={intensity}
                              type="button"
                              onClick={() => setHighlightSettings({ ...highlightSettings, overlayIntensity: intensity })}
                              className={`py-2 px-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                                highlightSettings.overlayIntensity === intensity
                                  ? 'bg-primary text-on-primary shadow-sm'
                                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                              }`}
                            >
                              {intensity}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="overlayEnabled"
                          checked={highlightSettings.overlayEnabled}
                          onChange={(e) => setHighlightSettings({ ...highlightSettings, overlayEnabled: e.target.checked })}
                          className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor="overlayEnabled" className="text-xs font-medium text-on-surface cursor-pointer">
                          Enable dark bottom gradient overlay on cards
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 mt-4 rounded-xl bg-primary-container text-on-primary font-bold text-sm shadow hover:brightness-105 cursor-pointer"
                      >
                        Save Appearance Settings
                      </button>
                    </div>

                    {/* Live Simulation Preview Card */}
                    <div className="p-6 rounded-3xl bg-surface-container-lowest border border-surface-container/80 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-bold text-on-surface">Live Student Homepage Preview</h3>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            Interactive Demo
                          </span>
                        </div>

                        {/* Simulated Hero Card */}
                        <div className="relative h-64 rounded-2xl overflow-hidden border border-surface-container shadow-md">
                          <img
                            src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800"
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />

                          {/* Dynamic Gradient Overlay */}
                          {highlightSettings.overlayEnabled && (
                            <div
                              className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent ${
                                highlightSettings.overlayIntensity === 'light'
                                  ? 'opacity-40'
                                  : highlightSettings.overlayIntensity === 'medium'
                                  ? 'opacity-70'
                                  : highlightSettings.overlayIntensity === 'dark'
                                  ? 'opacity-85'
                                  : 'opacity-95'
                              }`}
                            />
                          )}

                          <div className="absolute bottom-4 left-4 right-4 text-white">
                            <span className="inline-block bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded mb-1">
                              {highlightSettings.badgeText}
                            </span>
                            <h4 className="text-lg font-bold drop-shadow leading-tight">
                              Super Loaded Burger Feast
                            </h4>
                            <p className="text-xs text-white/90 drop-shadow line-clamp-1 mt-0.5">
                              {highlightSettings.subtitle}
                            </p>
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-base font-bold text-amber-300">₹84</span>
                              <button
                                type="button"
                                className="px-3 py-1 rounded-lg bg-white text-black font-bold text-xs"
                              >
                                {highlightSettings.ctaText}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-on-surface-variant mt-4">
                        Settings take effect immediately across all student and subscription member sessions upon saving.
                      </p>
                    </div>
                  </form>
                </div>
              )}

              {/* 7. ACCOUNT SETTINGS TAB */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-on-surface">Owner Account Settings</h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      View profile and securely update your owner portal password
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Account Info Card */}
                    <div className="p-6 rounded-3xl bg-surface-container-lowest border border-surface-container/80 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-on-surface">Account Credentials</h3>

                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-2 border-b border-surface-container">
                          <span className="text-on-surface-variant">Owner Username:</span>
                          <strong className="text-on-surface font-mono">{owner?.username || 'owner'}</strong>
                        </div>
                        <div className="flex justify-between py-2 border-b border-surface-container">
                          <span className="text-on-surface-variant">Role Authorization:</span>
                          <strong className="text-primary uppercase font-bold">OWNER (Full Portal Access)</strong>
                        </div>
                        <div className="flex justify-between py-2 border-b border-surface-container">
                          <span className="text-on-surface-variant">Associated Email:</span>
                          <strong className="text-on-surface">{owner?.email || 'owner@jecrc.edu'}</strong>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-on-surface-variant">Initial Password Status:</span>
                          <strong className={mustChangePassword ? 'text-amber-600' : 'text-emerald-600'}>
                            {mustChangePassword ? 'Default Password Active (Change Recommended)' : 'Secured with Custom Password'}
                          </strong>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-surface-container">
                        <button
                          onClick={() => {
                            logout();
                            navigate('/owner/login');
                          }}
                          className="w-full py-2.5 rounded-xl bg-error/10 text-error hover:bg-error/20 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">logout</span>
                          <span>Logout of Owner Account</span>
                        </button>
                      </div>
                    </div>

                    {/* Change Password Card */}
                    <div className="p-6 rounded-3xl bg-surface-container-lowest border border-surface-container/80 shadow-sm">
                      <h3 className="text-sm font-bold text-on-surface mb-4">Change Password</h3>

                      <form onSubmit={handleAccountPasswordChange} className="space-y-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={accountPasswordData.currentPassword}
                            onChange={(e) => setAccountPasswordData({ ...accountPasswordData, currentPassword: e.target.value })}
                            required
                            placeholder="Enter current password"
                            className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={accountPasswordData.newPassword}
                            onChange={(e) => setAccountPasswordData({ ...accountPasswordData, newPassword: e.target.value })}
                            required
                            placeholder="Minimum 8 characters"
                            className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={accountPasswordData.confirmNewPassword}
                            onChange={(e) => setAccountPasswordData({ ...accountPasswordData, confirmNewPassword: e.target.value })}
                            required
                            placeholder="Re-enter new password"
                            className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={accountPasswordLoading}
                          className="w-full py-2.5 mt-2 rounded-xl bg-primary-container text-on-primary font-bold text-xs shadow hover:brightness-105 cursor-pointer disabled:opacity-50"
                        >
                          {accountPasswordLoading ? 'Updating...' : 'Update Password'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT DEAL */}
      {/* ==================================================== */}
      {dealModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-surface-container-lowest border border-surface-container rounded-3xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-on-surface">
                {editingDeal ? 'Edit Promotional Deal' : 'Add New Promotional Deal'}
              </h3>
              <button
                onClick={() => setDealModalOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Deal Title *</label>
                <input
                  type="text"
                  value={dealFormData.title}
                  onChange={(e) => setDealFormData({ ...dealFormData, title: e.target.value })}
                  required
                  placeholder="e.g. Super Loaded Burger Combo"
                  className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Description</label>
                <textarea
                  rows={2}
                  value={dealFormData.description}
                  onChange={(e) => setDealFormData({ ...dealFormData, description: e.target.value })}
                  placeholder="Details about what is included in this offer..."
                  className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm"
                />
              </div>

              {/* Pricing & Automatic Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Original Price (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={dealFormData.originalPrice}
                    onChange={(e) => setDealFormData({ ...dealFormData, originalPrice: Number(e.target.value) })}
                    required
                    className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Discounted Price (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={dealFormData.discountedPrice}
                    onChange={(e) => setDealFormData({ ...dealFormData, discountedPrice: Number(e.target.value) })}
                    required
                    className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm font-bold text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Auto Calculated Discount</label>
                  <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-bold flex items-center justify-center">
                    {calculatedDiscountPercent > 0 ? `${calculatedDiscountPercent}% OFF` : 'Invalid Price'}
                  </div>
                </div>
              </div>

              {/* Image Upload / URL */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Deal Image</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={dealFormData.image}
                    onChange={(e) => setDealFormData({ ...dealFormData, image: e.target.value })}
                    placeholder="Enter image URL or upload below"
                    className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs"
                  />
                  <label className="px-3 py-2 bg-surface-container text-on-surface hover:bg-surface-container-high rounded-xl text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">upload_file</span>
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleImageFileChange(e, 'deal')}
                    />
                  </label>
                </div>
                {dealFormData.image && (
                  <div className="mt-2 w-24 h-16 rounded-xl overflow-hidden border border-surface-container">
                    <img src={dealFormData.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Audience and Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Available For</label>
                  <select
                    value={dealFormData.availableFor}
                    onChange={(e) => setDealFormData({ ...dealFormData, availableFor: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs"
                  >
                    <option value="both">Both Normal & Subscribers</option>
                    <option value="normal">Normal Users Only</option>
                    <option value="subscriber">Subscription Members Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Start Date</label>
                  <input
                    type="date"
                    value={dealFormData.startDate}
                    onChange={(e) => setDealFormData({ ...dealFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    value={dealFormData.expiryDate}
                    onChange={(e) => setDealFormData({ ...dealFormData, expiryDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dealFormData.showInHighlights}
                    onChange={(e) => setDealFormData({ ...dealFormData, showInHighlights: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <span>Show in Today's Highlights</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dealFormData.isActive}
                    onChange={(e) => setDealFormData({ ...dealFormData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <span>Active Deal</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setDealModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow hover:brightness-105 cursor-pointer"
                >
                  Save Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT COUPON */}
      {/* ==================================================== */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-surface-container-lowest border border-surface-container rounded-3xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-on-surface">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h3>
              <button
                onClick={() => setCouponModalOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Coupon Name</label>
                  <input
                    type="text"
                    value={couponFormData.couponName}
                    onChange={(e) => setCouponFormData({ ...couponFormData, couponName: e.target.value })}
                    placeholder="e.g. Student Exam Special"
                    className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    value={couponFormData.couponCode}
                    onChange={(e) => setCouponFormData({ ...couponFormData, couponCode: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g. EXAM20"
                    className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm font-mono font-bold uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Description</label>
                <input
                  type="text"
                  value={couponFormData.description}
                  onChange={(e) => setCouponFormData({ ...couponFormData, description: e.target.value })}
                  placeholder="Offer details shown in checkout..."
                  className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Discount Type</label>
                  <select
                    value={couponFormData.discountType}
                    onChange={(e) => setCouponFormData({ ...couponFormData, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Discount Value *</label>
                  <input
                    type="number"
                    min="1"
                    value={couponFormData.discountValue}
                    onChange={(e) => setCouponFormData({ ...couponFormData, discountValue: Number(e.target.value) })}
                    required
                    className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    value={couponFormData.maxDiscount}
                    onChange={(e) => setCouponFormData({ ...couponFormData, maxDiscount: e.target.value })}
                    placeholder="Optional (e.g. 50)"
                    className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={couponFormData.minimumOrderValue}
                    onChange={(e) => setCouponFormData({ ...couponFormData, minimumOrderValue: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    value={couponFormData.totalUsageLimit}
                    onChange={(e) => setCouponFormData({ ...couponFormData, totalUsageLimit: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Per-User Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={couponFormData.perUserUsageLimit}
                    onChange={(e) => setCouponFormData({ ...couponFormData, perUserUsageLimit: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Audience Eligibility</label>
                  <select
                    value={couponFormData.availableFor}
                    onChange={(e) => setCouponFormData({ ...couponFormData, availableFor: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs"
                  >
                    <option value="both">Both Normal & Subscribers</option>
                    <option value="normal">Normal Users Only</option>
                    <option value="subscriber">Subscription Members Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Start Date</label>
                  <input
                    type="date"
                    value={couponFormData.startDate}
                    onChange={(e) => setCouponFormData({ ...couponFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    value={couponFormData.expiryDate}
                    onChange={(e) => setCouponFormData({ ...couponFormData, expiryDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={couponFormData.isActive}
                  onChange={(e) => setCouponFormData({ ...couponFormData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-primary"
                />
                <span>Active Coupon</span>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow hover:brightness-105 cursor-pointer"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT REWARD */}
      {/* ==================================================== */}
      {rewardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-surface-container-lowest border border-surface-container rounded-3xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-on-surface">
                {editingReward ? 'Edit Reward Perk' : 'Create New Reward Perk'}
              </h3>
              <button
                onClick={() => setRewardModalOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Reward Title *</label>
                <input
                  type="text"
                  value={rewardFormData.title}
                  onChange={(e) => setRewardFormData({ ...rewardFormData, title: e.target.value })}
                  required
                  placeholder="e.g. Free Cold Coffee"
                  className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Offer Display Text *</label>
                <input
                  type="text"
                  value={rewardFormData.offerText}
                  onChange={(e) => setRewardFormData({ ...rewardFormData, offerText: e.target.value })}
                  required
                  placeholder="e.g. Free Cold Coffee on orders above ₹100"
                  className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm font-bold text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Description</label>
                <textarea
                  rows={2}
                  value={rewardFormData.description}
                  onChange={(e) => setRewardFormData({ ...rewardFormData, description: e.target.value })}
                  placeholder="Details about perk redemption..."
                  className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Reward Type</label>
                  <select
                    value={rewardFormData.rewardType}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, rewardType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs"
                  >
                    <option value="perk">Campus Perk</option>
                    <option value="voucher">Discount Voucher</option>
                    <option value="free_item">Free Food Item</option>
                    <option value="combo">Special Combo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Points Cost</label>
                  <input
                    type="number"
                    min="0"
                    value={rewardFormData.pointsCost}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, pointsCost: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Audience</label>
                  <select
                    value={rewardFormData.availableFor}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, availableFor: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs"
                  >
                    <option value="both">Both Normal & Subscribers</option>
                    <option value="normal">Normal Users Only</option>
                    <option value="subscriber">Subscription Members Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Start Date</label>
                  <input
                    type="date"
                    value={rewardFormData.startDate}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    value={rewardFormData.expiryDate}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, expiryDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-surface-container-low border border-surface-container-high rounded-xl text-xs"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rewardFormData.isActive}
                  onChange={(e) => setRewardFormData({ ...rewardFormData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-primary"
                />
                <span>Active Reward Perk</span>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setRewardModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow hover:brightness-105 cursor-pointer"
                >
                  Save Reward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
