import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Variant } from '@/api/types';
import { Chip, Text } from '@/ui';

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
  return (
    <View style={styles.gap}>
      {sizes.length > 0 && (
        <View style={styles.gap}>
          <Text variant="ui" color={missing && !size ? 'danger' : 'ink2'}>
            المقاس: <Text variant="ui" weight="bold">{size ?? 'اختار مقاس'}</Text>
          </Text>
          <View style={styles.wrap}>
            {sizes.map((s) => (
              <Chip key={s} label={s} selected={size === s} disabled={!sizeAvailable(s)} onPress={() => onSize(s)} />
            ))}
          </View>
        </View>
      )}
      {colors.length > 0 && (
        <View style={styles.gap}>
          <Text variant="ui" color={missing && !color ? 'danger' : 'ink2'}>
            اللون: <Text variant="ui" weight="bold">{color ?? 'اختار لون'}</Text>
          </Text>
          <View style={styles.wrap}>
            {colors.map((c) => (
              <Chip key={c} label={c} selected={color === c} disabled={!colorAvailable(c)} onPress={() => onColor(c)} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ gap: { gap: 10 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
