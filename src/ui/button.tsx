import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type Palette } from '@/theme';
import { Icon } from './icon';
import { Tap } from './pressable';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'lg' | 'md' | 'sm';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconEnd?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const HEIGHT: Record<Size, number> = { lg: 54, md: 46, sm: 38 };

/** Disabled and spinning while `loading` so async actions can't be double-submitted. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconEnd,
  loading,
  disabled,
  block = true,
  style,
  accessibilityHint,
}: ButtonProps) {
  const t = useTheme();
  const colors: Record<Variant, { bg: string; fg: keyof Palette; border?: string }> = {
    primary: { bg: t.c.accent, fg: 'onAccent' },
    secondary: { bg: t.c.surface, fg: 'ink', border: t.c.lineStrong },
    ghost: { bg: 'transparent', fg: 'accent' },
    danger: { bg: t.c.danger, fg: 'onAccent' },
    soft: { bg: t.c.accentSoft, fg: 'accent' },
  };
  const c = colors[variant];
  const inactive = disabled || loading;

  return (
    <Tap
      onPress={onPress}
      disabled={inactive}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: size === 'sm' ? 14 : 20,
          backgroundColor: c.bg,
          borderColor: c.border ?? 'transparent',
          borderRadius: t.radius.md,
          opacity: disabled && !loading ? 0.5 : 1,
          alignSelf: block ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.c[c.fg]} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon as={icon} size={size === 'sm' ? 18 : 20} color={c.fg} />}
          <Text variant={size === 'sm' ? 'ui' : 'bodyStrong'} color={c.fg} numberOfLines={1} style={styles.label}>
            {label}
          </Text>
          {iconEnd && <Icon as={iconEnd} size={size === 'sm' ? 18 : 20} color={c.fg} />}
        </View>
      )}
    </Tap>
  );
}

/** Round icon-only button; always labelled for screen readers. */
export function IconButton({
  icon,
  label,
  onPress,
  color = 'ink',
  background,
  size = 44,
  badge,
  filled,
}: {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  color?: keyof Palette;
  background?: keyof Palette;
  size?: number;
  badge?: number;
  filled?: boolean;
}) {
  const t = useTheme();
  return (
    <Tap
      onPress={onPress}
      accessibilityLabel={badge ? `${label}، ${badge}` : label}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background ? t.c[background] : 'transparent',
      }}
    >
      <Icon as={icon} color={color} size={Math.round(size * 0.5)} fill={filled ? t.c[color] : undefined} />
      {!!badge && (
        <View style={[styles.badge, { backgroundColor: t.c.brand, borderColor: t.c.surface }]}>
          <Text variant="meta" color="onAccent" weight="bold" style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' },
  label: { flexShrink: 1 },
  badge: {
    position: 'absolute',
    top: 2,
    end: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 13 },
});
