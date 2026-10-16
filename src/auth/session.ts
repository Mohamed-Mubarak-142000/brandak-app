import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

/**
 * The session: tokens live in the OS keychain/keystore (SecureStore), mirrored in memory for
 * the API client. `status` drives the auth gates; the profile itself comes from `useMe()`.
 */

const KEY = 'brandak.session';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface SessionState {
  status: 'loading' | 'guest' | 'authed';
  tokens: Tokens | null;
  hydrate: () => Promise<void>;
  signIn: (tokens: Tokens) => Promise<void>;
  setTokens: (tokens: Tokens) => Promise<void>;
  signOut: () => Promise<void>;
}

const store = {
  read: async () => (Platform.OS === 'web' ? localStorage.getItem(KEY) : SecureStore.getItemAsync(KEY)),
  write: async (v: string) => (Platform.OS === 'web' ? localStorage.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
  clear: async () => (Platform.OS === 'web' ? localStorage.removeItem(KEY) : SecureStore.deleteItemAsync(KEY)),
};

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  tokens: null,
  hydrate: async () => {
    try {
      const raw = await store.read();
      const tokens = raw ? (JSON.parse(raw) as Tokens) : null;
      set({ tokens, status: tokens ? 'authed' : 'guest' });
    } catch {
      set({ tokens: null, status: 'guest' });
    }
  },
  signIn: async (tokens) => {
    await store.write(JSON.stringify(tokens)).catch(() => undefined);
    set({ tokens, status: 'authed' });
  },
  setTokens: async (tokens) => {
    await store.write(JSON.stringify(tokens)).catch(() => undefined);
    set({ tokens });
  },
  signOut: async () => {
    await store.clear().catch(() => undefined);
    set({ tokens: null, status: 'guest' });
  },
}));
