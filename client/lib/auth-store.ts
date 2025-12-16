'use client';

import { create } from 'zustand';
import { User } from './types';

export interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthStore>((set) => {
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    
    initialize: () => {
      // Restore from localStorage on client-side initialization
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        if (storedUser && storedToken) {
          try {
            set({
              user: JSON.parse(storedUser),
              token: storedToken,
              isAuthenticated: true,
            });
          } catch (e) {
            // Invalid stored data, clear it
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
          }
        }
      }
    },
    
    setAuth: (user, token) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true });
    },
    
    logout: () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});
