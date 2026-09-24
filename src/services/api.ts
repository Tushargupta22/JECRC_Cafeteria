const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE_URL = import.meta.env.VITE_API_URL || (!isLocalhost && isBrowser ? '/api' : 'http://localhost:5000/api');

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Token helper
const TOKEN_KEY = 'cafetarea_token';

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store'  // Prevent browser caching
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error || data.message || `Request failed with status ${response.status}`,
        data
      );
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network or parse error
    throw new ApiError(0, err.message || 'Network connection failed. Please ensure the backend is running.');
  }
}

/* ==================== INTERFACES ==================== */

export interface BackendUser {
  _id: string;
  name: string;
  shortName?: string;
  email: string;
  role: 'user' | 'student' | 'admin';
  phone?: string;
  profileImage?: string;
  department?: string;
  year?: string;
  studentId?: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  dailyRank?: number;
  dailySpend?: number;
  subscription?: {
    plan: string;
    price: number;
    discountPercentage: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface BackendFood {
  _id: string;
  id?: string;
  name: string;
  description: string;
  category: string;
  station: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewsCount: number;
  isAvailable: boolean;
  inStock?: boolean;
  stockCount: number;
  stockDelta?: number;
  preparationTime: string;
  prepTime?: string;
  calories: number;
  tags: string[];
  isVeg: boolean;
  isPopular?: boolean;
  isChefSpecial?: boolean;
  createdAt?: string;
}

export interface BackendOrderItem {
  foodId: string;
  name: string;
  price: number;
  quantity: number;
  stationTag?: string;
  notes?: string;
}

export interface BackendOrder {
  _id: string;
  id?: string;
  orderNumber: string;
  tokenNumber: string;
  userId: string | { _id: string; name: string; email: string };
  customerName?: string;
  items: BackendOrderItem[];
  subtotal: number;
  discount: number;
  subscriptionDiscount: number;
  offerDiscount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: 'Pending' | 'Confirmed' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled';
  status?: 'new' | 'preparing' | 'ready' | 'completed';
  loyaltyAwarded?: boolean;
  etaMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BackendOffer {
  _id: string;
  title: string;
  description: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  image?: string;
  couponCode: string;
  validFrom: string;
  validUntil: string;
  targetAudience: string;
  isActive: boolean;
  userId?: string | null;
  minimumOrder?: number;
  applicableCategory?: string;
  applicableFoodName?: string;
  recommendationReason?: string;
  badgeText?: string;
  icon?: string;
}

export interface SubscriptionPlan {
  id?: string;
  plan?: string;
  name: string;
  price: number;
  durationDays: number;
  discountPercentage: number;
  description?: string;
  features: string[];
}

export interface LeaderboardEntry {
  rank: number;
  userId?: string;
  name: string;
  shortName: string;
  department: string;
  points: number;
  ordersCount: number;
  spend: number;
  avatar: string;
  badge?: string;
  isCurrentUser: boolean;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  activeSubscriptions: number;
  totalLoyaltyPointsDistributed: number;
  ordersByStatus: Record<string, number>;
  popularFoods: Array<{
    _id: string;
    food: BackendFood;
    totalQuantity: number;
    revenue: number;
  }>;
}

export interface LoyaltyTransaction {
  _id: string;
  userId: string;
  points: number;
  type: 'earned' | 'redeemed' | 'bonus';
  reason: string;
  orderId?: string;
  createdAt: string;
}

/* ==================== API MODULES ==================== */

// Authentication
export const authApi = {
  register: (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    role?: 'student' | 'admin';
    adminAccessCode?: string;
    phone?: string;
  }) =>
    request<{ message: string; user: BackendUser; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  login: (payload: { email: string; password: string; portal?: 'student' | 'admin' }) =>
    request<{ message: string; user: BackendUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  forgotPassword: (payload: { email: string; newPassword?: string; confirmPassword?: string }) =>
    request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getMe: () =>
    request<{ user: BackendUser }>('/auth/me'),

  updateProfile: (payload: {
    name?: string;
    shortName?: string;
    department?: string;
    year?: string;
    phone?: string;
    profileImage?: string;
  }) =>
    request<{ success: boolean; message: string; user: BackendUser }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  uploadAvatar: (image: string) =>
    request<{ success: boolean; message: string; imageUrl: string; user: BackendUser }>('/auth/upload-avatar', {
      method: 'POST',
      body: JSON.stringify({ image })
    }),

  logout: () => {
    setAuthToken(null);
    return request<{ message: string }>('/auth/logout', { method: 'POST' }).catch(() => ({ message: 'Logged out' }));
  }
};

// Foods
export const foodApi = {
  getFoods: (params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All Items' && params.category !== 'all') {
      query.append('category', params.category);
    }
    if (params?.search) {
      query.append('search', params.search);
    }
    const qs = query.toString();
    return request<{ count: number; foods: BackendFood[] }>(`/foods${qs ? `?${qs}` : ''}`);
  },

  getFood: (id: string) =>
    request<{ food: BackendFood }>(`/foods/${id}`),

  createFood: (data: Partial<BackendFood>) =>
    request<{ message: string; food: BackendFood }>('/foods', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateFood: (id: string, data: Partial<BackendFood>) =>
    request<{ message: string; food: BackendFood }>(`/foods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteFood: (id: string) =>
    request<{ message: string }>(`/foods/${id}`, {
      method: 'DELETE'
    })
};

// Orders
export const orderApi = {
  createOrder: (payload: {
    items: Array<{ foodId: string; quantity: number; notes?: string }>;
    couponCode?: string;
    paymentMethod?: string;
  }) =>
    request<{ message: string; order: BackendOrder }>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getOrders: () =>
    request<{ count: number; orders: BackendOrder[] }>('/orders'),

  getOrder: (id: string) =>
    request<{ order: BackendOrder }>(`/orders/${id}`),

  updateOrderStatus: (id: string, status: string) =>
    request<{ message: string; order: BackendOrder; loyaltyAwarded?: boolean }>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
};

// Offers
export const offerApi = {
  getOffers: () =>
    request<{ count: number; offers: BackendOffer[] }>('/offers'),

  getPersonalizedOffers: () =>
    request<{
      userStats?: any;
      recommendations?: BackendOffer[];
      offers?: BackendOffer[];
      offer?: BackendOffer;
      message?: string;
    }>('/offers/personalized'),

  validateCoupon: (payload: { couponCode: string; subtotal: number; items?: any[] }) =>
    request<{
      success: boolean;
      valid: boolean;
      discountAmount: number;
      discountType: 'percentage' | 'fixed';
      discountValue: number;
      couponCode: string;
      message: string;
      offer?: BackendOffer;
    }>('/offers/validate-coupon', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  createOffer: (data: Partial<BackendOffer>) =>
    request<{ message: string; offer: BackendOffer }>('/offers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateOffer: (id: string, data: Partial<BackendOffer>) =>
    request<{ message: string; offer: BackendOffer }>(`/offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteOffer: (id: string) =>
    request<{ message: string }>(`/offers/${id}`, {
      method: 'DELETE'
    })
};

// Subscriptions
export const subscriptionApi = {
  getPlans: () =>
    request<{ plans: SubscriptionPlan[] }>('/subscriptions/plans'),

  subscribe: (planInput: string) =>
    request<{ message: string; subscription: any; user: BackendUser }>('/subscriptions/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan: planInput, planName: planInput })
    }),

  getCurrent: () =>
    request<{ active: boolean; subscription: any }>('/subscriptions/current'),

  cancel: () =>
    request<{ message: string }>('/subscriptions/cancel', {
      method: 'POST'
    })
};

// Leaderboard
export const leaderboardApi = {
  getLeaderboard: (period: 'daily' | 'weekly' | 'monthly' = 'daily') =>
    request<{ period: string; count: number; leaderboard: LeaderboardEntry[] }>(`/leaderboard?period=${period}`)
};

// Admin Analytics
export const analyticsApi = {
  getAdminAnalytics: () =>
    request<{ analytics: AdminAnalytics }>('/admin/analytics')
};

// Loyalty
export const loyaltyApi = {
  getTransactions: () =>
    request<{ count: number; transactions: LoyaltyTransaction[] }>('/loyalty/transactions').catch(() => ({
      count: 0,
      transactions: []
    }))
};
