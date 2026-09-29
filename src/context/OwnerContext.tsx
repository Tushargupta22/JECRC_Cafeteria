import React, { createContext, useContext, useState, useEffect } from 'react';
import { ownerApi, getOwnerToken, setOwnerToken } from '../services/api';

export interface OwnerUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  mustChangePassword?: boolean;
}

interface OwnerContextType {
  owner: OwnerUser | null;
  isOwnerAuthenticated: boolean;
  mustChangePassword: boolean;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<{ success: boolean; mustChangePassword: boolean }>;
  changePassword: (data: { currentPassword: string; newPassword: string; confirmNewPassword: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const OwnerContext = createContext<OwnerContextType | undefined>(undefined);

export const OwnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [owner, setOwner] = useState<OwnerUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);

  const checkAuth = async () => {
    const token = getOwnerToken();
    if (!token) {
      setOwner(null);
      setMustChangePassword(false);
      setIsLoading(false);
      return;
    }

    try {
      const res = await ownerApi.getProfile();
      if (res.success && res.owner) {
        setOwner(res.owner);
        setMustChangePassword(Boolean(res.owner.mustChangePassword));
      } else {
        setOwnerToken(null);
        setOwner(null);
      }
    } catch {
      setOwnerToken(null);
      setOwner(null);
      setMustChangePassword(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await ownerApi.login(credentials);
      if (res.success && res.token) {
        setOwnerToken(res.token);
        setOwner(res.owner);
        setMustChangePassword(Boolean(res.mustChangePassword));
        return { success: true, mustChangePassword: Boolean(res.mustChangePassword) };
      }
      throw new Error(res.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string; confirmNewPassword: string }) => {
    setIsLoading(true);
    try {
      const res = await ownerApi.changePassword(data);
      if (res.success) {
        setMustChangePassword(false);
        if (owner) {
          setOwner({ ...owner, mustChangePassword: false });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setOwnerToken(null);
    setOwner(null);
    setMustChangePassword(false);
  };

  return (
    <OwnerContext.Provider
      value={{
        owner,
        isOwnerAuthenticated: Boolean(owner && owner.role === 'owner'),
        mustChangePassword,
        isLoading,
        login,
        changePassword,
        logout,
        refreshProfile: checkAuth
      }}
    >
      {children}
    </OwnerContext.Provider>
  );
};

export const useOwner = (): OwnerContextType => {
  const context = useContext(OwnerContext);
  if (!context) {
    throw new Error('useOwner must be used within an OwnerProvider');
  }
  return context;
};
