'use client';

import { useAuthStore, type AuthStore } from '../auth-store';

export function useAuth(): AuthStore {
  return useAuthStore();
}
