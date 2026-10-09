import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile, UserRole } from '../types';
import { authService } from '../services/authService';
import { api } from '../services/api';
import { realtime } from '../realtime/socket';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  activeRole: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('campus_sos_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    realtime.disconnect();
    await authService.logout();
    setUser(null);
  }, []);

  useEffect(() => {
    // Register 401 callback in API client
    api.onUnauthorized(() => {
      logout();
    });

    // Restore session
    const restoreSession = async () => {
      const token = api.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await authService.getProfile();
        setUser(profile);
        localStorage.setItem('campus_sos_user', JSON.stringify(profile));
        realtime.connect();
      } catch {
        // Attempt refresh
        const refreshed = await authService.refreshToken();
        if (refreshed) {
          try {
            const profile = await authService.getProfile();
            setUser(profile);
            localStorage.setItem('campus_sos_user', JSON.stringify(profile));
            realtime.connect();
          } catch {
            await logout();
          }
        } else {
          await logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [logout]);

  const login = async (email: string, pass: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, pass);
      setUser(res.user);
      realtime.connect();
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        activeRole: user?.role || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
