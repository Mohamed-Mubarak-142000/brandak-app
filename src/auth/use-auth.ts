import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { create } from 'zustand';

import { api } from '@/api/client';
import { queryClient } from '@/api/query-client';
import type { AuthResult, Me } from '@/api/types';
import { useSession } from './session';

export const meKey = ['me'] as const;

/**
 * Store accounts manage their store only: the app opens on the store dashboard and hides
 * shopping (cart, checkout, wishlist). The API refuses those for them too.
 */
export function useIsSeller() {
  return !!useMe().data?.brand;
}

/** The signed-in profile (with `brand` when the user manages one). Disabled for guests. */
export function useMe() {
  const authed = useSession((s) => s.status === 'authed');
  return useQuery({ queryKey: meKey, queryFn: () => api.get<Me>('/users/me'), enabled: authed, staleTime: 60_000 });
}

export async function completeSignIn(result: AuthResult) {
  await useSession.getState().signIn({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  queryClient.setQueryData<Me>(meKey, { ...result.user, brand: null });
  await queryClient.invalidateQueries({ queryKey: meKey });
}

export async function signOut() {
  // Revoke on the API first (needs the token), then forget everything locally.
  await api.post('/auth/logout').catch(() => undefined);
  await useSession.getState().signOut();
  queryClient.clear();
}

/** Guest-gate: actions that need an account open a "sign in to continue" sheet instead. */
export const useAuthPrompt = create<{ open: boolean; reason: string; show: (reason: string) => void; close: () => void }>((set) => ({
  open: false,
  reason: '',
  show: (reason) => set({ open: true, reason }),
  close: () => set({ open: false }),
}));

export function useRequireAuth() {
  const authed = useSession((s) => s.status === 'authed');
  const show = useAuthPrompt((s) => s.show);
  return useCallback(
    (reason: string, action: () => void) => {
      if (authed) action();
      else show(reason);
    },
    [authed, show],
  );
}
