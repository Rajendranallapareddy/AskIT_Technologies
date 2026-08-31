import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { authApi } from '../api/endpoints';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (accessToken: string, user: User) => void;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      login: (accessToken, user) => {
        localStorage.setItem('askit_access_token', accessToken);
        set({ user, isAuthenticated: true, isLoading: false });
      },
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // ignore network errors on logout
        }
        localStorage.removeItem('askit_access_token');
        set({ user: null, isAuthenticated: false });
      },
      fetchMe: async () => {
        try {
          const res = await authApi.me();
          set({ user: res.data.data, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    { name: 'askit-auth', partialize: (state) => ({ user: state.user }) }
  )
);
