import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Variant } from '@/api/types';
import { useTheme } from '@/theme';
import { Chip, Tap, Text } from '@/ui';

const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];

/**
 * Size × colour selection derived from the variant list. An option is struck through when no
 * in-stock variant matches it together with the other current choice.
 */
export function useVariantSelection(variants: Variant[], size: string | null, color: string | null) {
  return useMemo(() => {
    const sizes = uniq(variants.map((v) => v.size));
    const colors = uniq(variants.map((v) => v.color));
    const match = (s: string | null, c: string | null) =>
      variants.find((v) => (sizes.length ? v.size === s : true) && (colors.length ? v.color === c : true));
    const selected = variants.length === 1 ? variants[0] : match(size, color);
    const sizeAvailable = (s: string) => variants.some((v) => v.size === s && v.inStock && (!color || !colors.length || v.color === color));
    const colorAvailable = (c: string) => variants.some((v) => v.color === c && v.inStock && (!size || !sizes.length || v.size === size));
    return { sizes, colors, selected, sizeAvailable, colorAvailable };
  }, [variants, size, color]);
}

/**
 * Photos for the chosen colour: those tagged with it, else every photo. Untagged photos (shown
 * for all colours) only fill in when the colour has none of its own.
 */
export function imagesForColor(images: string[], colors: (string | null)[] | undefined, color: string | null) {
  if (!color || !colors?.length) return images;
  const own = images.filter((_, i) => colors[i] === color);
  return own.length ? own : images;
}

/** Sellers type colours freely ("اسود", "أسود", "Black"); the common ones get a swatch. */
const SWATCHES: Record<string, string> = {
  اسود: '#1F1A17', black: '#1F1A17',
  ابيض: '#FFFFFF', white: '#FFFFFF', 'اوف وايت': '#F5EFE3', offwhite: '#F5EFE3', كريمي: '#F3EAD7', cream: '#F3EAD7',
  رصاصي: '#9A9A9A', رمادي: '#9A9A9A', سكني: '#B5B5B5', gray: '#9A9A9A', grey: '#9A9A9A', فضي: '#C7C9CC', silver: '#C7C9CC',
  احمر: '#C62828', red: '#C62828', نبيتي: '#6D1B2B', عنابي: '#6D1B2B', burgundy: '#6D1B2B',
  ازرق: '#1E5BB8', blue: '#1E5BB8', كحلي: '#1B2A4A', navy: '#1B2A4A', لبني: '#9CC9F0', سماوي: '#4FB3E8',
  اخضر: '#2E7D32', green: '#2E7D32', زيتي: '#556B2F', olive: '#556B2F', منت: '#A8DCC5',
  بني: '#6D4C41', brown: '#6D4C41', بيج: '#D9C4A3', beige: '#D9C4A3', جملي: '#C19A6B', كافيه: '#8B6B4E',
  اصفر: '#F2C230', yellow: '#F2C230', برتقالي: '#F16B21', orange: '#F16B21', دهبي: '#C9A227', ذهبي: '#C9A227', gold: '#C9A227',
  وردي: '#F4A6C0', بينك: '#F4A6C0', pink: '#F4A6C0', روز: '#E8B4B8', بنفسجي: '#7E57C2', موف: '#9C7BB5', purple: '#7E57C2',
};

const normalize = (s: string) =>
  s.trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[-_]/g, ' ').replace(/\s+/g, ' ');

export const swatchFor = (name: string) => SWATCHES[normalize(name)] ?? SWATCHES[normalize(name).replace(/ /g, '')];

export function VariantPicker({
  sizes,
  colors,
  size,
  color,
  onSize,
  onColor,
  sizeAvailable,
  colorAvailable,
  missing,
}: {
  sizes: string[];
  colors: string[];
  size: string | null;
  color: string | null;
  onSize: (s: string) => void;
  onColor: (c: string) => void;
  sizeAvailable: (s: string) => boolean;
  colorAvailable: (c: string) => boolean;
  missing?: boolean;
}) {
  // Swatches only when every colour has one; a mixed row of dots and words reads badly.
  const allSwatches = colors.every((c) => !!swatchFor(c));
  return (
    <View style={styles.block}>
      {colors.length > 0 && (
        <View style={styles.gap}>
          <Text variant="ui" color={missing && !color ? 'danger' : 'ink2'}>
            اللون: <Text variant="ui" weight="bold" color={missing && !color ? 'danger' : 'ink'}>{color ?? 'اختار لون'}</Text>
          </Text>
          <View style={styles.wrap}>
            {colors.map((c) =>
              allSwatches ? (
                <Swatch key={c} name={c} hex={swatchFor(c)!} selected={color === c} disabled={!colorAvailable(c)} onPress={() => onColor(c)} />
              ) : (
                <Chip key={c} label={c} selected={color === c} disabled={!colorAvailable(c)} onPress={() => onColor(c)} />
              ),
            )}
          </View>
        </View>
      )}
      {sizes.length > 0 && (
        <View style={styles.gap}>
          <Text variant="ui" color={missing && !size ? 'danger' : 'ink2'}>
            المقاس: <Text variant="ui" weight="bold" color={missing && !size ? 'danger' : 'ink'}>{size ?? 'اختار مقاس'}</Text>
          </Text>
          <View style={styles.wrap}>
            {sizes.map((s) => (
              <SizePill key={s} label={s} selected={size === s} disabled={!sizeAvailable(s)} onPress={() => onSize(s)} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function Swatch({ name, hex, selected, disabled, onPress }: { name: string; hex: string; selected: boolean; disabled: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      pressScale={0.9}
      accessibilityRole="radio"
      accessibilityLabel={disabled ? `${name}، غير متاح` : name}
      accessibilityState={{ selected, disabled }}
      style={[styles.ring, { borderColor: selected ? t.c.accent : 'transparent', opacity: disabled ? 0.35 : 1 }]}
    >
      <View style={[styles.dot, { backgroundColor: hex, borderColor: t.c.lineStrong }]} />
      {disabled && <View style={[styles.strike, { backgroundColor: t.c.ink2 }]} />}
    </Tap>
  );
}

function SizePill({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      pressScale={0.94}
      accessibilityRole="radio"
      accessibilityLabel={disabled ? `مقاس ${label}، غير متاح` : `مقاس ${label}`}
      accessibilityState={{ selected, disabled }}
      style={[
        styles.size,
        {
          backgroundColor: selected ? t.c.accent : t.c.surface,
          borderColor: selected ? t.c.accent : t.c.line,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Text variant="ui" weight="semibold" color={selected ? 'onAccent' : 'ink'} style={disabled && styles.struck}>
        {label}
      </Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  block: { gap: 18 },
  gap: { gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ring: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  strike: { position: 'absolute', width: 40, height: 1.5, transform: [{ rotate: '-45deg' }] },
  size: { minWidth: 46, height: 46, borderRadius: 23, borderWidth: 1, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  struck: { textDecorationLine: 'line-through' },
});
