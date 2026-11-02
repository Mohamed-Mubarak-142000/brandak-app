import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import type { CategoryTemplate } from '@/api/types';
import { swatchFor } from '@/features/catalog/variant-picker';
import { latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { Button, Card, Chip, IconButton, Tap, Text, TextField } from '@/ui';

/** One size × colour combination's stock and optional own price/SKU. */
export interface Cell {
  id?: string;
  stock: string;
  price: string;
  sku: string;
}
export type Cells = Record<string, Cell>;
export const cellKey = (size: string, color: string) => `${size}|${color}`;
export const emptyCell = (): Cell => ({ stock: '', price: '', sku: '' });

/** Every combination the seller picked; a product with neither sizes nor colours has one. */
export const combos = (sizes: string[], colors: string[]) =>
  (sizes.length ? sizes : ['']).flatMap((size) => (colors.length ? colors : ['']).map((color) => ({ size, color, key: cellKey(size, color) })));

/** Colours most products come in, offered as one-tap swatches. */
const COMMON_COLORS = ['أسود', 'أبيض', 'أوف وايت', 'رمادي', 'كحلي', 'أزرق', 'لبني', 'أحمر', 'نبيتي', 'وردي', 'بيج', 'بني', 'جملي', 'أخضر', 'زيتي', 'أصفر', 'برتقالي', 'بنفسجي', 'دهبي', 'فضي'];

/**
 * Sizes and colours come from the category template (المقاس، السعة، المساحة...) as chips, then
 * one quantity per combination. Replaces typing every variant by hand.
 */
export function VariantBuilder({
  template,
  sizes,
  colors,
  cells,
  onSizes,
  onColors,
  onCells,
  unit,
  error,
}: {
  template: Pick<CategoryTemplate, 'size' | 'color'>;
  sizes: string[];
  colors: string[];
  cells: Cells;
  onSizes: (s: string[]) => void;
  onColors: (c: string[]) => void;
  onCells: (c: Cells) => void;
  unit: string;
  error?: string;
}) {
  const t = useTheme();
  const [ownPrices, setOwnPrices] = useState(() => Object.values(cells).some((c) => c.price.trim()));
  const [skus, setSkus] = useState(() => Object.values(cells).some((c) => c.sku.trim()));
  const [fill, setFill] = useState('');
  const sizeAxis = template.size;
  const colorAxis = template.color;
  // Values already on the product stay pickable even if the category's list changed.
  const sizeChoices = sizeAxis ? [...new Set([...sizeAxis.values, ...sizes])] : sizes;
  const colorChoices = colorAxis ? [...new Set([...COMMON_COLORS, ...colors])] : colors;
  const list = combos(sizes, colors);

  const toggle = (value: string, current: string[], choices: string[], set: (v: string[]) => void) => {
    const next = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
    // Keep the template's order (S, M, L...) rather than tap order.
    set(next.sort((a, b) => rank(choices, a) - rank(choices, b)));
  };
  const setCell = (key: string, patch: Partial<Cell>) => onCells({ ...cells, [key]: { ...(cells[key] ?? emptyCell()), ...patch } });
  const fillAll = () => {
    const n = latinDigits(fill).trim();
    if (!n) return;
    onCells(Object.fromEntries(list.map((c) => [c.key, { ...(cells[c.key] ?? emptyCell()), stock: n }])));
  };

  return (
    <View style={styles.gap}>
      {sizeAxis && (
        <AxisPicker
          label={sizeAxis.label}
          hint={sizeAxis.values.length ? `اختار كل ${sizeAxis.label} المتاحة عندك` : `اكتب ${sizeAxis.label} واضغط إضافة`}
          choices={sizeChoices}
          selected={sizes}
          allowCustom={sizeAxis.allowCustom}
          onToggle={(v) => toggle(v, sizes, sizeChoices, onSizes)}
          onAdd={(v) => !sizes.includes(v) && onSizes([...sizes, v])}
        />
      )}
      {colorAxis && (
        <AxisPicker
          label={colorAxis.label}
          hint="اختار الألوان المتاحة، أو سيبها فاضية لو لون واحد"
          choices={colorChoices}
          selected={colors}
          allowCustom={colorAxis.allowCustom}
          swatches
          onToggle={(v) => toggle(v, colors, colorChoices, onColors)}
          onAdd={(v) => !colors.includes(v) && onColors([...colors, v])}
        />
      )}

      <Text variant="bodyStrong">{list.length > 1 ? `الكميات (${list.length} اختيار)` : 'الكمية المتاحة'}</Text>
      {error ? (
        <Text variant="meta" color="danger">
          {error}
        </Text>
      ) : (
        <Text variant="meta" color="ink3">
          {list.length > 1 ? `اكتب عدد ${unit === 'قطعة' ? 'القطع' : `الـ${unit}`} المتاحة من كل اختيار. 0 = خلص، والعميل يقدر يطلب تنبيه لما يرجع.` : `عدد ${unit === 'قطعة' ? 'القطع' : `الـ${unit}`} اللي عندك`}
        </Text>
      )}

      {list.length > 3 && (
        <View style={[styles.row, styles.end]}>
          <View style={styles.flex}>
            <TextField label="نفس الكمية للكل" placeholder="مثال: 10" value={fill} onChangeText={setFill} keyboardType="number-pad" ltr />
          </View>
          <Button label="تطبيق" variant="soft" size="md" onPress={fillAll} />
        </View>
      )}

      {groupByColor(list, colors).map((group) => (
        <Card key={group.color || 'all'} style={styles.gapSm}>
          {group.color ? (
            <View style={styles.colorHead}>
              {swatchFor(group.color) ? <View style={[styles.dot, { backgroundColor: swatchFor(group.color), borderColor: t.c.lineStrong }]} /> : null}
              <Text variant="ui" weight="semibold">
                {group.color}
              </Text>
            </View>
          ) : null}
          {group.items.map((c) => (
            <View key={c.key} style={styles.gapSm}>
              <View style={[styles.row, styles.end]}>
                <View style={styles.flex}>
                  <TextField
                    label={c.size || (c.color ? 'الكمية' : `الكمية (${unit})`)}
                    placeholder="0"
                    value={cells[c.key]?.stock ?? ''}
                    onChangeText={(s) => setCell(c.key, { stock: s })}
                    keyboardType="number-pad"
                    ltr
                  />
                </View>
                {ownPrices && (
                  <View style={styles.flex}>
                    <TextField label="سعر مختلف" placeholder="نفس السعر" optional value={cells[c.key]?.price ?? ''} onChangeText={(s) => setCell(c.key, { price: s })} keyboardType="decimal-pad" ltr />
                  </View>
                )}
              </View>
              {skus && <TextField label="SKU" optional value={cells[c.key]?.sku ?? ''} onChangeText={(s) => setCell(c.key, { sku: s })} autoCapitalize="characters" ltr maxLength={60} />}
            </View>
          ))}
        </Card>
      ))}

      <View style={[styles.toggle, { borderColor: t.c.line, borderRadius: t.radius.md }]}>
        <Text variant="ui" style={styles.flex}>
          {list.length > 1 ? 'بعض الاختيارات بسعر مختلف' : 'سعر مختلف'}
        </Text>
        <Switch value={ownPrices} onValueChange={setOwnPrices} trackColor={{ true: t.c.accent, false: t.c.lineStrong }} thumbColor="#fff" accessibilityLabel="أسعار مختلفة" />
      </View>
      <View style={[styles.toggle, { borderColor: t.c.line, borderRadius: t.radius.md }]}>
        <Text variant="ui" style={styles.flex}>
          أكواد SKU للمخزن
        </Text>
        <Switch value={skus} onValueChange={setSkus} trackColor={{ true: t.c.accent, false: t.c.lineStrong }} thumbColor="#fff" accessibilityLabel="أكواد SKU" />
      </View>
    </View>
  );
}

function AxisPicker({
  label,
  hint,
  choices,
  selected,
  allowCustom,
  swatches,
  onToggle,
  onAdd,
}: {
  label: string;
  hint: string;
  choices: string[];
  selected: string[];
  allowCustom: boolean;
  swatches?: boolean;
  onToggle: (v: string) => void;
  onAdd: (v: string) => void;
}) {
  const t = useTheme();
  const [custom, setCustom] = useState('');
  const add = () => {
    const v = custom.trim().slice(0, 30);
    if (!v) return;
    onAdd(v);
    setCustom('');
  };
  return (
    <View style={styles.gapSm}>
      <Text variant="bodyStrong">
        {label}
        {selected.length ? <Text variant="meta" color="accent">{`  (${selected.length})`}</Text> : null}
      </Text>
      <Text variant="meta" color="ink3">
        {hint}
      </Text>
      <View style={styles.wrap}>
        {choices.map((v) => {
          const on = selected.includes(v);
          const hex = swatches ? swatchFor(v) : undefined;
          return hex ? (
            <Tap
              key={v}
              onPress={() => onToggle(v)}
              pressScale={0.95}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={v}
              style={[styles.swatchChip, { borderColor: on ? t.c.brand : t.c.line, backgroundColor: on ? t.c.accentSoft : t.c.surface }]}
            >
              <View style={[styles.dot, { backgroundColor: hex, borderColor: t.c.lineStrong }]} />
              <Text variant="meta" color={on ? 'accent' : 'ink'} weight={on ? 'semibold' : 'regular'}>
                {v}
              </Text>
            </Tap>
          ) : (
            <Chip key={v} label={v} selected={on} onPress={() => onToggle(v)} />
          );
        })}
      </View>
      {allowCustom && (
        <View style={[styles.row, styles.end]}>
          <View style={styles.flex}>
            <TextField label={`${label} مش في القائمة؟`} placeholder="اكتبه هنا" value={custom} onChangeText={setCustom} maxLength={30} onSubmitEditing={add} returnKeyType="done" />
          </View>
          <IconButton icon={custom.trim() ? Plus : X} label="إضافة" size={44} background="surface" onPress={custom.trim() ? add : () => setCustom('')} />
        </View>
      )}
    </View>
  );
}

const rank = (choices: string[], v: string) => {
  const i = choices.indexOf(v);
  return i < 0 ? Number.MAX_SAFE_INTEGER : i;
};

function groupByColor(list: ReturnType<typeof combos>, colors: string[]) {
  if (!colors.length) return [{ color: '', items: list }];
  return colors.map((color) => ({ color, items: list.filter((c) => c.color === color) }));
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  gapSm: { gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  end: { alignItems: 'flex-end' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  swatchChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
});
