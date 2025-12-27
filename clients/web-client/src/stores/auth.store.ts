import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (id: string, name: string, role: UserRole, phone?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (id, name, role, phone) => {
        set({
          user: { id, name, role, phone },
          isAuthenticated: true,
        });
        // 模擬 token (未來接入真實認證)
        localStorage.setItem('token', `mock-token-${id}`);
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('token');
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
