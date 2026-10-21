/**
 * Brandak design tokens — the same palette as the admin dashboard (`brandak dashboard/app/globals.css`):
 * the logo's off-white ground and exact orange (#F16B21). `accent` is the orange deepened so white
 * text on it passes WCAG AA; use it for filled buttons, and `brand` for marks, indicators and counters.
 */

const light = {
  ground: '#FEFCF7',
  surface: '#FFFFFF',
  sunken: '#FFF6EE',
  line: '#F1E5D8',
  lineStrong: '#E3CFBB',

  ink: '#2A1D14',
  ink2: '#5B4839',
  ink3: '#7A6656',

  brand: '#F16B21',
  accent: '#C2500F',
  accentPressed: '#A5430B',
  accentSoft: '#FFEADB',
  onAccent: '#FFFFFF',

  success: '#1D7348',
  successSoft: '#E3F2E8',
  warning: '#7A5B00',
  warningSoft: '#F7F0D4',
  danger: '#B42318',
  dangerSoft: '#FDE8E5',

  overlay: 'rgba(42, 29, 20, 0.45)',
  shadow: '#2A1D14',
  skeleton: '#F4EAE0',
};

export type Palette = typeof light;

const dark: Palette = {
  ground: '#17110D',
  surface: '#211913',
  sunken: '#2A2018',
  line: '#3A2D23',
  lineStrong: '#4E3D30',

  ink: '#FBF3EA',
  ink2: '#D9C7B6',
  ink3: '#B09A87',

  brand: '#F7843F',
  accent: '#E0651F',
  accentPressed: '#C2500F',
  accentSoft: '#3D2416',
  onAccent: '#1A0E06',

  success: '#5CC48C',
  successSoft: '#173326',
  warning: '#E2BE52',
  warningSoft: '#33290F',
  danger: '#F2766B',
  dangerSoft: '#3D1A16',

  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
  skeleton: '#2E241C',
};

export const palettes = { light, dark };

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 } as const;

export const fonts = {
  display: 'Cairo_800ExtraBold',
  displayMedium: 'Cairo_600SemiBold',
  regular: 'Cairo_400Regular',
  medium: 'Cairo_500Medium',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
} as const;

/** Type scale: 12 meta · 14 ui · 16 body · 18 lead · 20 section · 26 page · 34 display. */
export const type = {
  meta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 20 },
  ui: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 23 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 27 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 27 },
  lead: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 30 },
  section: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 34 },
  page: { fontFamily: fonts.display, fontSize: 26, lineHeight: 42 },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 54 },
} as const;

export type TypeVariant = keyof typeof type;

/** Durations for micro-interactions (ui-ux-pro-max: 150–300ms). */
export const motion = { fast: 150, base: 220, slow: 300 } as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };
