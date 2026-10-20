'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from './api';
import type { AuthUser } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isManager: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    tokenStore.set(res.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const isManager = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, isManager, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
