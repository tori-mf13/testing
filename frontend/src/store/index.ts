import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';
import api from '../services/api';

// ─── Auth Store ──────────────────────────────────────────────────

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await api.post<{
          accessToken: string;
          refreshToken: string;
          user: User;
        }>('/auth/login', { email, password });

        api.setToken(res.accessToken);
        set({
          user: res.user,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          isAuthenticated: true,
        });
      },

      register: async (data) => {
        await api.post('/auth/register', data);
      },

      logout: () => {
        api.setToken(null);
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'unifyit-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          api.setToken(state.accessToken);
        }
      },
    }
  )
);

// ─── Theme Store ─────────────────────────────────────────────────

interface ThemeStore {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      isDark: true,
      toggle: () => {
        const next = !get().isDark;
        set({ isDark: next });
        document.documentElement.classList.toggle('dark', next);
        document.documentElement.classList.toggle('light', !next);
      },
    }),
    { name: 'unifyit-theme' }
  )
);

// ─── Sidebar Store ───────────────────────────────────────────────

interface SidebarStore {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  toggleCollapse: () => void;
}

export const useSidebarStore = create<SidebarStore>((set, get) => ({
  isOpen: true,
  isCollapsed: false,
  toggle: () => set({ isOpen: !get().isOpen }),
  setOpen: (open) => set({ isOpen: open }),
  toggleCollapse: () => set({ isCollapsed: !get().isCollapsed }),
}));

// ─── Role helpers ────────────────────────────────────────────────

export function canAccess(role: UserRole | undefined, requiredRoles: UserRole[]): boolean {
  if (!role) return false;
  return requiredRoles.includes(role);
}

export function isAdmin(role?: UserRole): boolean {
  return role === 'ADMIN';
}

export function isStaff(role?: UserRole): boolean {
  return role === 'ADMIN' || role === 'IT_STAFF';
}

export function isManager(role?: UserRole): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}
