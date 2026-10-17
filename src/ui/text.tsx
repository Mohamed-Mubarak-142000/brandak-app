import { Text as RNText, type TextProps } from 'react-native';

import { useTheme, type Palette, type TypeVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: keyof Palette;
  align?: 'auto' | 'left' | 'right' | 'center';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

/** All copy goes through here: Plex for text, Reem Kufi for headings, RTL-aware alignment. */
export function Text({ variant = 'body', color = 'ink', align, weight, style, ...rest }: AppTextProps) {
  const t = useTheme();
  const base = t.type[variant];
  return (
    <RNText
      textBreakStrategy="simple"
      {...rest}
      maxFontSizeMultiplier={1.6}
      style={[
        base,
        { color: t.c[color] }, align && { textAlign: align },
        weight && { fontFamily: t.fonts[weight] },
        style,
      ]}
    />
  );
}
