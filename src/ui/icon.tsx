import type { LucideIcon } from 'lucide-react-native';
import { I18nManager } from 'react-native';

import { useTheme, type Palette } from '@/theme';

export interface IconProps {
  as: LucideIcon;
  size?: number;
  color?: keyof Palette;
  /** Mirror in RTL — for arrows/chevrons that point "forward" or "back". */
  directional?: boolean;
  strokeWidth?: number;
  fill?: string;
}

export function Icon({ as: Glyph, size = 22, color = 'ink', directional, strokeWidth = 1.9, fill }: IconProps) {
  const t = useTheme();
  return (
    <Glyph
      size={size}
      color={t.c[color]}
      strokeWidth={strokeWidth}
      fill={fill ?? 'none'}
      style={directional && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}
