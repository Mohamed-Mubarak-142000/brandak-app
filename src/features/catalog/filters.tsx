import { ArrowDownWideNarrow, SlidersHorizontal, X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import type { Query } from '@/api/client';
import { useCategories } from '@/api/queries';
import { latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { Button, Icon, IconButton, MultiSelect, Select, Sheet, Tap, Text, TextField } from '@/ui';

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular';

export interface ProductFilters {
  sort?: ProductSort;
  categoryIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export const SORT_LABEL: Record<ProductSort, string> = {
  newest: 'الأحدث',
  popular: 'الأكثر مبيعاً',
  rating: 'الأعلى تقييماً',
  price_asc: 'السعر: الأقل أولاً',
  price_desc: 'السعر: الأعلى أولاً',
};

/** Filters → API query (several categories travel as one comma-separated param). */
export function productQuery(f: ProductFilters): Query {
  return {
    sort: f.sort,
    categoryIds: f.categoryIds?.length ? f.categoryIds.join(',') : undefined,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    inStock: f.inStock,
  };
}

export function countFilters(f: ProductFilters, lockCategory?: boolean) {
  return [f.sort && f.sort !== 'newest', !lockCategory && f.categoryIds?.length, f.minPrice != null, f.maxPrice != null, f.inStock].filter(Boolean).length;
}

/** Square filter button with a badge, meant to sit next to a search field. */
export function FilterButton({ count, onPress, label = 'الفلاتر' }: { count: number; onPress: () => void; label?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.filterBtn, { backgroundColor: count ? t.c.accentSoft : t.c.surface, borderColor: count ? t.c.brand : t.c.line, borderRadius: t.radius.md }]}>
      <IconButton
        icon={SlidersHorizontal}
        label={count ? `${label}، ${count} مفعّلة` : label}
        color={count ? 'accent' : 'ink'}
        badge={count || undefined}
        onPress={onPress}
        size={48}
      />
    </View>
  );
}

export interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/** Removable chips for the active filters; renders nothing when none are set. Wraps, never scrolls. */
export function ActiveChips({ chips }: { chips: ActiveChip[] }) {
  const t = useTheme();
  if (!chips.length) return null;
  return (
    <View style={styles.chips}>
      {chips.map((c) => (
        <Tap
          key={c.key}
          onPress={c.onRemove}
          pressScale={1}
          hitSlop={4}
          accessibilityLabel={`إزالة ${c.label}`}
          style={[styles.chip, { backgroundColor: t.c.accentSoft, borderColor: t.c.brand }]}
        >
          <Text variant="meta" weight="semibold" color="accent">
            {c.label}
          </Text>
          <Icon as={X} size={13} color="accent" />
        </Tap>
      ))}
    </View>
  );
}

/** Chips describing the active product filters. */
export function useProductChips(value: ProductFilters, onChange: (f: ProductFilters) => void, lockCategory?: boolean): ActiveChip[] {
  const categories = useCategories();
  const name = (id: string) => categories.data?.find((c) => c._id === id)?.nameAr ?? 'قسم';
  return [
    ...(value.sort && value.sort !== 'newest' ? [{ key: 'sort', label: SORT_LABEL[value.sort], onRemove: () => onChange({ ...value, sort: undefined }) }] : []),
    ...(!lockCategory
      ? (value.categoryIds ?? []).map((id) => ({
          key: `cat-${id}`,
          label: name(id),
          onRemove: () => onChange({ ...value, categoryIds: value.categoryIds?.filter((x) => x !== id) }),
        }))
      : []),
    ...(value.minPrice != null ? [{ key: 'min', label: `من ${value.minPrice} ج`, onRemove: () => onChange({ ...value, minPrice: undefined }) }] : []),
    ...(value.maxPrice != null ? [{ key: 'max', label: `لحد ${value.maxPrice} ج`, onRemove: () => onChange({ ...value, maxPrice: undefined }) }] : []),
    ...(value.inStock ? [{ key: 'stock', label: 'المتوفر بس', onRemove: () => onChange({ ...value, inStock: undefined }) }] : []),
  ];
}

/**
 * Filter button + chips for screens without a search field (category, store page).
 * Explore puts the FilterButton next to its search bar instead.
 */
export function FilterBar({ value, onChange, lockCategory }: { value: ProductFilters; onChange: (f: ProductFilters) => void; lockCategory?: boolean }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  // A fresh key per opening resets the sheet's draft to the applied filters.
  const [session, setSession] = useState(0);
  const count = countFilters(value, lockCategory);
  const chips = useProductChips(value, onChange, lockCategory);
  return (
    <View style={styles.bar}>
      <Tap
        onPress={() => {
          setSession((n) => n + 1);
          setOpen(true);
        }}
        style={[styles.barBtn, { borderColor: count ? t.c.brand : t.c.lineStrong, backgroundColor: count ? t.c.accentSoft : t.c.surface }]}
        accessibilityLabel={count ? `الفلاتر، ${count} مفعّلة` : 'الفلاتر'}
      >
        <Icon as={SlidersHorizontal} size={18} color={count ? 'accent' : 'ink'} />
        <Text variant="ui" color={count ? 'accent' : 'ink'}>
          {count ? `فلاتر (${count})` : 'فلترة'}
        </Text>
      </Tap>
      <ActiveChips chips={chips} />
      <ProductFilterSheet key={session} open={open} onClose={() => setOpen(false)} value={value} onApply={onChange} lockCategory={lockCategory} />
    </View>
  );
}

/** Product filters in a bottom sheet: sort (dropdown), categories (multi-select), price, stock. */
export function ProductFilterSheet({
  open,
  onClose,
  value,
  onApply,
  lockCategory,
}: {
  open: boolean;
  onClose: () => void;
  value: ProductFilters;
  onApply: (f: ProductFilters) => void;
  lockCategory?: boolean;
}) {
  const t = useTheme();
  const categories = useCategories();
  const [draft, setDraft] = useState(value);
  const [min, setMin] = useState(value.minPrice != null ? String(value.minPrice) : '');
  const [max, setMax] = useState(value.maxPrice != null ? String(value.maxPrice) : '');

  const num = (s: string) => {
    const n = Number(latinDigits(s));
    return s.trim() && Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const minN = num(min);
  const maxN = num(max);
  const priceError = minN != null && maxN != null && minN > maxN ? 'أقل سعر لازم يكون أصغر من أعلى سعر' : undefined;

  const apply = () => {
    onApply({ ...draft, minPrice: minN, maxPrice: maxN });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="فلترة وترتيب"
      footer={
        <View style={styles.footer}>
          <Button label="عرض النتائج" onPress={apply} disabled={!!priceError} style={styles.flex} />
          <Button
            label="مسح"
            variant="secondary"
            block={false}
            onPress={() => {
              setDraft({});
              setMin('');
              setMax('');
            }}
          />
        </View>
      }
    >
      <Select
        label="الترتيب"
        sheetTitle="رتّب المنتجات حسب"
        value={draft.sort ?? 'newest'}
        onChange={(sort) => setDraft({ ...draft, sort })}
        options={(Object.keys(SORT_LABEL) as ProductSort[]).map((s) => ({ value: s, label: SORT_LABEL[s], icon: ArrowDownWideNarrow }))}
      />

      {!lockCategory && (
        <MultiSelect
          label="الأقسام"
          placeholder="كل الأقسام"
          sheetTitle="اختار الأقسام"
          value={draft.categoryIds ?? []}
          onChange={(categoryIds) => setDraft({ ...draft, categoryIds })}
          loading={categories.isLoading}
          options={(categories.data ?? []).filter((c) => c.isActive && !c.parentId).map((c) => ({ value: c._id, label: c.nameAr }))}
        />
      )}

      <Text variant="ui" color="ink2">
        السعر (ج.م)
      </Text>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label="من" value={min} onChangeText={setMin} keyboardType="number-pad" placeholder="0" ltr />
        </View>
        <View style={styles.flex}>
          <TextField label="إلى" value={max} onChangeText={setMax} keyboardType="number-pad" placeholder="بدون حد" ltr error={priceError} />
        </View>
      </View>

      <View style={[styles.switchRow, { borderColor: t.c.line }]}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">المتوفر بس</Text>
          <Text variant="meta" color="ink3">
            اخفي المنتجات اللي نفدت كميتها
          </Text>
        </View>
        <Switch
          value={!!draft.inStock}
          onValueChange={(v) => setDraft({ ...draft, inStock: v || undefined })}
          trackColor={{ true: t.c.accent, false: t.c.lineStrong }}
          thumbColor="#fff"
          accessibilityLabel="المتوفر بس"
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filterBtn: { borderWidth: 1, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  bar: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  barBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footer: { flexDirection: 'row', gap: 10 },
});
