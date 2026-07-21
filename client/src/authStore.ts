import { create } from 'zustand';
import type { User } from './types';
import { api } from './lib/api';

type Status = 'loading' | 'anon' | 'authed';

interface AuthState {
  status: Status;
  user: User | null;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (roles: User['role'][]) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  async init() {
    try {
      const user = await api.me();
      set({ user, status: 'authed' });
    } catch {
      set({ user: null, status: 'anon' });
    }
  },

  async login(email, password) {
    const user = await api.login(email, password); // throws on failure
    set({ user, status: 'authed' });
  },

  async logout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    set({ user: null, status: 'anon' });
  },

  can(roles) {
    const u = get().user;
    return !!u && roles.includes(u.role);
  },
}));
