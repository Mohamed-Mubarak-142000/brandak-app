import { Star, X, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { OrderStatus } from '@/api/types';
import { formatMoney } from '@/lib/format';
import { useTheme, type Palette } from '@/theme';
import { Icon } from './icon';
import { Tap } from './pressable';
import { Text } from './text';

/** Filter / choice chip. 40pt tall plus hit slop to clear the 44pt target. */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  removable,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  removable?: boolean;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole={removable ? 'button' : 'togglebutton'}
      accessibilityState={{ selected: !!selected, disabled }}
      accessibilityLabel={removable ? `إزالة ${label}` : label}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? t.c.accentSoft : t.c.surface,
          borderColor: selected ? t.c.brand : t.c.line,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {icon && <Icon as={icon} size={16} color={selected ? 'accent' : 'ink2'} />}
      <Text variant="ui" color={selected ? 'accent' : 'ink2'} style={disabled && styles.strike}>
        {label}
      </Text>
      {removable && <Icon as={X} size={14} color="accent" />}
    </Tap>
  );
}

export function Badge({ label, tone = 'brand' }: { label: string; tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' }) {
  const t = useTheme();
  const map = {
    brand: [t.c.accentSoft, 'accent'],
    success: [t.c.successSoft, 'success'],
    warning: [t.c.warningSoft, 'warning'],
    danger: [t.c.dangerSoft, 'danger'],
    neutral: [t.c.sunken, 'ink2'],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text variant="meta" weight="semibold" color={fg}>
        {label}
      </Text>
    </View>
  );
}

const STATUS_TONE: Record<OrderStatus, 'brand' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  CONFIRMED: 'brand',
  PROCESSING: 'brand',
  SHIPPED: 'brand',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export const ORDER_STATUS_AR: Record<OrderStatus, string> = {
  PENDING: 'في انتظار التأكيد',
  CONFIRMED: 'تم التأكيد',
  PROCESSING: 'جاري التجهيز',
  SHIPPED: 'في الطريق',
  DELIVERED: 'تم التوصيل',
  CANCELLED: 'ملغي',
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return <Badge label={ORDER_STATUS_AR[status]} tone={STATUS_TONE[status]} />;
}

export function PriceTag({ price, compareAt, size = 'md' }: { price: number; compareAt?: number | null; size?: 'sm' | 'md' | 'lg' }) {
  const t = useTheme();
  const off = compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;
  const variant = size === 'lg' ? 'page' : size === 'md' ? 'bodyStrong' : 'ui';
  return (
    <View style={styles.price} accessibilityLabel={off ? `${formatMoney(price)} بدل ${formatMoney(compareAt!)}` : formatMoney(price)}>
      <Text variant={variant} weight={size === 'lg' ? undefined : 'bold'} style={size === 'lg' && { fontFamily: t.fonts.bold }}>
        {formatMoney(price)}
      </Text>
      {!!off && (
        <>
          <Text variant="meta" color="ink3" style={styles.strike}>
            {formatMoney(compareAt!)}
          </Text>
          <Badge label={`-${off}%`} tone="danger" />
        </>
      )}
    </View>
  );
}

export function Rating({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  const t = useTheme();
  if (!count) return null;
  return (
    <View style={styles.rating} accessibilityLabel={`تقييم ${value.toFixed(1)} من 5، ${count} تقييم`}>
      <Star size={size} color={t.c.brand} fill={t.c.brand} />
      <Text variant="meta" weight="semibold">
        {value.toFixed(1)}
      </Text>
      <Text variant="meta" color="ink3">
        ({count})
      </Text>
    </View>
  );
}

/** Tap-to-rate stars, 44pt each. */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const t = useTheme();
  return (
    <View style={styles.starRow} accessibilityRole="adjustable" accessibilityLabel={`التقييم ${value} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Tap key={n} onPress={() => onChange(n)} accessibilityLabel={`${n} نجوم`} style={styles.starHit}>
          <Star size={32} color={n <= value ? t.c.brand : t.c.lineStrong} fill={n <= value ? t.c.brand : 'none'} strokeWidth={1.6} />
        </Tap>
      ))}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text variant="section">{title}</Text>
      {action && (
        <Tap onPress={onAction} hitSlop={10} pressScale={1} accessibilityLabel={`${action} ${title}`}>
          <Text variant="ui" color="accent">
            {action}
          </Text>
        </Tap>
      )}
    </View>
  );
}

export function Card({ children, style, padded = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.c.surface,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.c.line,
          padding: padded ? t.space.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.c.lineStrong, marginStart: inset }} />;
}

export function Banner({
  icon,
  title,
  body,
  tone = 'brand',
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  action?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  const bg = { brand: t.c.accentSoft, success: t.c.successSoft, warning: t.c.warningSoft, danger: t.c.dangerSoft }[tone];
  const fg: keyof Palette = tone === 'brand' ? 'accent' : tone;
  return (
    <View style={[styles.banner, { backgroundColor: bg, borderRadius: t.radius.md }]}>
      <Icon as={icon} color={fg} size={22} />
      <View style={styles.flex}>
        <Text variant="ui" weight="semibold" color={fg}>
          {title}
        </Text>
        {body && (
          <Text variant="meta" color="ink2">
            {body}
          </Text>
        )}
      </View>
      {action && (
        <Tap onPress={onAction} hitSlop={10} pressScale={1}>
          <Text variant="ui" weight="bold" color={fg}>
            {action}
          </Text>
        </Tap>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  strike: { textDecorationLine: 'line-through' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starRow: { flexDirection: 'row', justifyContent: 'center' },
  starHit: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  flex: { flex: 1, gap: 2 },
});
