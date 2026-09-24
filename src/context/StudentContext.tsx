import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { StudentProfile } from '../data/mockData';
import { authApi, leaderboardApi, getAuthToken, setAuthToken, BackendUser } from '../services/api';

const GUEST_STUDENT: StudentProfile = {
  id: '',
  name: 'Campus Guest',
  shortName: 'Guest',
  department: 'JECRC Student',
  year: '',
  hall: 'Campus Dining Hall',
  studentId: '',
  isPlusMember: false,
  plusExpiry: '',
  points: 0,
  dailyRank: 0,
  dailySpend: 0,
  orderStreakDays: 0,
  ordersCount: 0,
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
};

interface StudentContextType {
  student: StudentProfile;
  user: BackendUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  isEditProfileOpen: boolean;
  authModalConfig: { mode: 'login' | 'register'; portal: 'student' | 'admin' };
  redeemedVouchers: string[];
  openAuthModal: (mode?: 'login' | 'register', portal?: 'student' | 'admin') => void;
  closeAuthModal: () => void;
  openEditProfileModal: () => void;
  closeEditProfileModal: () => void;
  login: (email: string, password: string, portal?: 'student' | 'admin') => Promise<BackendUser>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    role?: 'student' | 'admin';
    adminAccessCode?: string;
    phone?: string;
  }) => Promise<BackendUser>;
  forgotPassword: (payload: { email: string; newPassword?: string; confirmPassword?: string }) => Promise<{ success: boolean; message: string }>;
  updateProfile: (payload: {
    name?: string;
    shortName?: string;
    department?: string;
    year?: string;
    phone?: string;
    profileImage?: string;
  }) => Promise<BackendUser>;
  uploadAvatar: (base64Image: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  redeemReward: (cost: number, title: string) => boolean;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [user, setUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [authModalConfig, setAuthModalConfig] = useState<{ mode: 'login' | 'register'; portal: 'student' | 'admin' }>({
    mode: 'login',
    portal: 'student'
  });
  const [redeemedVouchers, setRedeemedVouchers] = useState<string[]>([]);

  // Construct a live StudentProfile from real authenticated backend user
  const student: StudentProfile = React.useMemo(() => {
    if (!user) {
      return GUEST_STUDENT;
    }

    const nameParts = (user.name || 'JECRC Student').split(' ');
    const shortName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[1][0]}.` : nameParts[0];

    const hasActiveSub = !!(user.subscription?.isActive && new Date(user.subscription.endDate) > new Date());

    return {
      id: user._id,
      name: user.name,
      shortName,
      department: user.department || (user.role === 'admin' ? 'Campus Administration' : 'B.Tech CS'),
      year: user.year || (user.role === 'admin' ? 'Staff' : 'Year 3'),
      hall: 'JECRC Central Dining',
      studentId: user.studentId || `STU${user._id.slice(-4)}`,
      isPlusMember: hasActiveSub,
      plusExpiry: user.subscription?.endDate
        ? new Date(user.subscription.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Active',
      points: user.loyaltyPoints ?? 0,
      dailyRank: user.dailyRank ?? 0,
      dailySpend: user.dailySpend ?? 0,
      orderStreakDays: (user.totalOrders && user.totalOrders > 0) ? Math.min(14, Math.floor(user.totalOrders / 2) + 1) : 0,
      ordersCount: user.totalOrders ?? 0,
      avatar: user.profileImage || GUEST_STUDENT.avatar
    };
  }, [user]);

  const refreshUser = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authApi.getMe();
      if (res && res.user) {
        let updatedUser = { ...res.user };
        try {
          const lbRes = await leaderboardApi.getLeaderboard('daily');
          if (lbRes && lbRes.leaderboard) {
            const myEntry = lbRes.leaderboard.find(
              (item: any) => item.userId === res.user._id || item.name === res.user.name
            );
            if (myEntry) {
              updatedUser.dailyRank = myEntry.rank;
              updatedUser.dailySpend = myEntry.spend;
            } else {
              updatedUser.dailyRank = 0;
              updatedUser.dailySpend = 0;
            }
          }
        } catch {
          // Keep backend provided rank or 0
        }
        setUser(updatedUser);
      }
    } catch {
      // If token expired, clear it
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const openAuthModal = (mode: 'login' | 'register' = 'login', portal: 'student' | 'admin' = 'student') => {
    setAuthModalConfig({ mode, portal });
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async (email: string, password: string, portal?: 'student' | 'admin'): Promise<BackendUser> => {
    const res = await authApi.login({ email, password, portal });
    if (res.token) {
      setAuthToken(res.token);
      setTokenState(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    role?: 'student' | 'admin';
    adminAccessCode?: string;
    phone?: string;
  }): Promise<BackendUser> => {
    const res = await authApi.register(payload);
    if (res.token) {
      setAuthToken(res.token);
      setTokenState(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const forgotPassword = async (payload: { email: string; newPassword?: string; confirmPassword?: string }) => {
    return await authApi.forgotPassword(payload);
  };

  const openEditProfileModal = () => setIsEditProfileOpen(true);
  const closeEditProfileModal = () => setIsEditProfileOpen(false);

  const updateProfile = async (payload: {
    name?: string;
    shortName?: string;
    department?: string;
    year?: string;
    phone?: string;
    profileImage?: string;
  }): Promise<BackendUser> => {
    const res = await authApi.updateProfile(payload);
    if (res && res.user) {
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.message || 'Profile update failed');
  };

  const uploadAvatar = async (base64Image: string): Promise<string> => {
    const res = await authApi.uploadAvatar(base64Image);
    if (res && res.imageUrl) {
      if (res.user) {
        setUser(res.user);
      }
      return res.imageUrl;
    }
    throw new Error(res.message || 'Avatar upload failed');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore
    } finally {
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
    }
  };

  const redeemReward = (cost: number, title: string): boolean => {
    if (student.points < cost) {
      alert(`You need at least ${cost} points to claim this voucher! Spend ₹${Math.round((cost - student.points) * 10)} more to reach ${cost} pts.`);
      return false;
    }

    // Optimistically deduct in profile if needed
    if (user) {
      setUser(prev => prev ? { ...prev, loyaltyPoints: Math.max(0, prev.loyaltyPoints - cost) } : null);
    }

    setRedeemedVouchers(prev => [...prev, title]);

    // Confetti celebration
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore
    }

    return true;
  };

  return (
    <StudentContext.Provider
      value={{
        student,
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'admin',
        isLoading,
        isAuthModalOpen,
        isEditProfileOpen,
        authModalConfig,
        redeemedVouchers,
        openAuthModal,
        closeAuthModal,
        openEditProfileModal,
        closeEditProfileModal,
        login,
        register,
        forgotPassword,
        updateProfile,
        uploadAvatar,
        logout,
        refreshUser,
        redeemReward
      }}
    >
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};
