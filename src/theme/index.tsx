import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { create } from 'zustand';

import { PREF, prefs } from '@/lib/storage';
import { fonts, motion, palettes, radius, space, type, type Palette } from './tokens';

export * from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

export const useThemeMode = create<{ mode: ThemeMode; setMode: (m: ThemeMode) => void }>((set) => ({
  mode: prefs.get<ThemeMode>(PREF.themeMode, 'light'),
  setMode: (mode) => {
    prefs.set(PREF.themeMode, mode);
    set({ mode });
  },
}));

export interface Theme {
  dark: boolean;
  c: Palette;
  space: typeof space;
  radius: typeof radius;
  type: typeof type;
  fonts: typeof fonts;
  motion: typeof motion;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const mode = useThemeMode((s) => s.mode);
  const dark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const theme = useMemo<Theme>(
    () => ({ dark, c: dark ? palettes.dark : palettes.light, space, radius, type, fonts, motion }),
    [dark],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}

/** Memoised style factory bound to the current theme: `const s = useStyles(makeStyles)`. */
export function useStyles<T>(factory: (t: Theme) => T): T {
  const theme = useTheme();
  const [cache] = useState(() => new Map<boolean, T>());
  if (!cache.has(theme.dark)) cache.set(theme.dark, factory(theme));
  return cache.get(theme.dark)!;
}
