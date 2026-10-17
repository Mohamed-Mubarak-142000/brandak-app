import { SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useCategories } from '@/api/queries';
import { latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { Button, Chip, Sheet, Tap, Text, TextField } from '@/ui';

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular';

export interface ProductFilters {
  sort?: ProductSort;
  categoryId?: string;
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

export function countFilters(f: ProductFilters, lockCategory?: boolean) {
  return [f.sort && f.sort !== 'newest', !lockCategory && f.categoryId, f.minPrice != null, f.maxPrice != null, f.inStock].filter(Boolean).length;
}

/** Filter button + removable chips for the active filters (same pattern as the dashboard). */
export function FilterBar({
  value,
  onChange,
  lockCategory,
}: {
  value: ProductFilters;
  onChange: (f: ProductFilters) => void;
  lockCategory?: boolean;
}) {
  const t = useTheme();
  const categories = useCategories();
  const [open, setOpen] = useState(false);
  // A fresh key per opening resets the draft to the applied filters without an effect.
  const [session, setSession] = useState(0);
  const count = countFilters(value, lockCategory);
  const catName = categories.data?.find((c) => c._id === value.categoryId)?.nameAr;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.barScroll} contentContainerStyle={styles.bar}>
        <Tap
          onPress={() => {
            setSession((n) => n + 1);
            setOpen(true);
          }}
          style={[styles.filterBtn, { borderColor: count ? t.c.brand : t.c.lineStrong, backgroundColor: count ? t.c.accentSoft : t.c.surface }]}
          accessibilityLabel={count ? `الفلاتر، ${count} مفعّلة` : 'الفلاتر'}
        >
          <SlidersHorizontal size={18} color={count ? t.c.accent : t.c.ink} />
          <Text variant="ui" color={count ? 'accent' : 'ink'}>
            {count ? `فلاتر (${count})` : 'فلترة وترتيب'}
          </Text>
        </Tap>
        {value.sort && value.sort !== 'newest' && <Chip label={SORT_LABEL[value.sort]} selected removable onPress={() => onChange({ ...value, sort: undefined })} />}
        {!lockCategory && catName && <Chip label={catName} selected removable onPress={() => onChange({ ...value, categoryId: undefined })} />}
        {value.minPrice != null && <Chip label={`من ${value.minPrice} ج`} selected removable onPress={() => onChange({ ...value, minPrice: undefined })} />}
        {value.maxPrice != null && <Chip label={`لحد ${value.maxPrice} ج`} selected removable onPress={() => onChange({ ...value, maxPrice: undefined })} />}
        {value.inStock && <Chip label="المتوفر بس" selected removable onPress={() => onChange({ ...value, inStock: undefined })} />}
      </ScrollView>
      <FilterSheet key={session} open={open} onClose={() => setOpen(false)} value={value} onApply={onChange} lockCategory={lockCategory} />
    </>
  );
}

function FilterSheet({
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
              setDraft(lockCategory ? { categoryId: value.categoryId } : {});
              setMin('');
              setMax('');
            }}
          />
        </View>
      }
    >
      <Text variant="bodyStrong">الترتيب</Text>
      <View style={styles.wrap}>
        {(Object.keys(SORT_LABEL) as ProductSort[]).map((s) => (
          <Chip key={s} label={SORT_LABEL[s]} selected={(draft.sort ?? 'newest') === s} onPress={() => setDraft({ ...draft, sort: s })} />
        ))}
      </View>

      {!lockCategory && (
        <>
          <Text variant="bodyStrong">القسم</Text>
          <View style={styles.wrap}>
            <Chip label="الكل" selected={!draft.categoryId} onPress={() => setDraft({ ...draft, categoryId: undefined })} />
            {(categories.data ?? [])
              .filter((c) => c.isActive && !c.parentId)
              .map((c) => (
                <Chip key={c._id} label={c.nameAr} selected={draft.categoryId === c._id} onPress={() => setDraft({ ...draft, categoryId: c._id })} />
              ))}
          </View>
        </>
      )}

      <Text variant="bodyStrong">السعر (ج.م)</Text>
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
  barScroll: { flexGrow: 0 },
  bar: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footer: { flexDirection: 'row', gap: 10 },
});
