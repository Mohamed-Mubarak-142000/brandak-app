import Storage from 'expo-sqlite/kv-store';

/**
 * Small synchronous key-value store for non-secret preferences (onboarding done, theme,
 * interests, recent searches). Tokens never go here — see `src/auth/session.ts` (SecureStore).
 */
export const prefs = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = Storage.getItemSync(key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      Storage.setItemSync(key, JSON.stringify(value));
    } catch {
      // Preferences are best-effort.
    }
  },
  remove(key: string) {
    try {
      Storage.removeItemSync(key);
    } catch {
      // ignore
    }
  },
};

export const PREF = {
  onboardingDone: 'onboarding.done',
  interests: 'onboarding.interests',
  themeMode: 'settings.theme',
  recentSearches: 'search.recent',
} as const;
