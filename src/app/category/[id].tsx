import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ListFilter } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { flatPages, useCategories, useCategoryTemplate, useProducts } from '@/api/queries';
import { categoryTree } from '@/features/catalog/category-tree';
import { FilterBar, productQuery, type ProductFilters } from '@/features/catalog/filters';
import { ProductGrid } from '@/features/catalog/product-grid';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Button, Chip, Icon, Sheet, Tap, Text } from '@/ui';

export default function CategoryScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const categories = useCategories();
  const tree = useMemo(() => categoryTree(categories.data ?? []), [categories.data]);
  const title = name ?? tree.byId.get(id)?.nameAr ?? 'القسم';
  const [filters, setFilters] = useState<ProductFilters>({});
  // A sub-category picked from the chips (the end of a branch); null = all of this category.
  const [sub, setSub] = useState<string | null>(null);
  const [specSel, setSpecSel] = useState<Record<string, string>>({});
  const [specsOpen, setSpecsOpen] = useState(false);
  const scope = sub ?? id;
  // Filterable fields of the category in view (brand, condition, size of a fridge...).
  const tpl = useCategoryTemplate(scope);
  const filterable = (tpl.data?.specs ?? []).filter((s) => s.filterable && (s.type === 'select' || s.type === 'boolean'));
  const specs = Object.entries(specSel)
    .filter(([k]) => filterable.some((s) => s.key === k))
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
  const q = useProducts({ ...productQuery(filters), categoryId: scope, specs: specs || undefined });
  const children = tree.children(id);
  const trail = tree.ancestors(id);

  const pickSub = (childId: string) => {
    haptic.tap();
    // A branch with its own sub-categories opens as its own page; an end of the tree filters here.
    if (!tree.isLeaf(childId)) return router.push({ pathname: '/category/[id]', params: { id: childId } });
    setSub(sub === childId ? null : childId);
    setSpecSel({});
  };

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <AppBar title={title} />
      <View style={styles.bar}>
        {trail.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trail}>
            {trail.map((c) => (
              <Tap key={c._id} onPress={() => router.push({ pathname: '/category/[id]', params: { id: c._id } })} pressScale={1} style={styles.crumb}>
                <Text variant="meta" color="accent">
                  {c.nameAr}
                </Text>
                <Icon as={ChevronLeft} size={14} color="ink3" />
              </Tap>
            ))}
            <Text variant="meta" color="ink3">
              {title}
            </Text>
          </ScrollView>
        )}
        {children.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="الكل" selected={!sub} onPress={() => setSub(null)} />
            {children.map((c) => (
              <Chip key={c._id} label={tree.isLeaf(c._id) ? c.nameAr : `${c.nameAr} ‹`} selected={sub === c._id} onPress={() => pickSub(c._id)} />
            ))}
          </ScrollView>
        )}
        <FilterBar value={filters} onChange={setFilters} lockCategory />
        {filterable.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label={specs ? `المواصفات (${specs.split(',').length})` : 'المواصفات'} icon={ListFilter} selected={!!specs} onPress={() => setSpecsOpen(true)} />
            {Object.entries(specSel).map(([k, v]) => {
              const def = filterable.find((s) => s.key === k);
              if (!def) return null;
              return (
                <Chip
                  key={k}
                  label={def.type === 'boolean' ? def.labelAr : `${def.labelAr}: ${v}`}
                  selected
                  removable
                  onPress={() => setSpecSel(({ [k]: _, ...rest }) => rest)}
                />
              );
            })}
          </ScrollView>
        )}
      </View>
      <View style={styles.flex}>
        <ProductGrid
          items={flatPages(q.data)}
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => q.refetch()}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          loadingMore={q.isFetchingNextPage}
          refreshing={q.isRefetching && !q.isFetchingNextPage}
          onRefresh={() => q.refetch()}
          header={<View style={{ height: 8 }} />}
        />
      </View>

      <Sheet
        open={specsOpen}
        onClose={() => setSpecsOpen(false)}
        title="فلترة بالمواصفات"
        footer={
          <View style={styles.footer}>
            <Button label="مسح" variant="soft" onPress={() => setSpecSel({})} />
            <View style={styles.flex}>
              <Button label="عرض المنتجات" onPress={() => setSpecsOpen(false)} />
            </View>
          </View>
        }
      >
        {filterable.map((s) => (
          <View key={s.key} style={styles.group}>
            <Text variant="ui" weight="semibold">
              {s.labelAr}
            </Text>
            <View style={styles.wrap}>
              {(s.type === 'boolean' ? ['true'] : s.options ?? []).map((o) => {
                const on = specSel[s.key] === o;
                return (
                  <Chip
                    key={o}
                    label={s.type === 'boolean' ? 'أيوه' : o}
                    selected={on}
                    onPress={() => setSpecSel((cur) => (on ? Object.fromEntries(Object.entries(cur).filter(([k]) => k !== s.key)) : { ...cur, [s.key]: o }))}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { paddingTop: 8, gap: 8 },
  trail: { paddingHorizontal: 16, alignItems: 'center', gap: 4 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  chips: { paddingHorizontal: 16, gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  group: { gap: 8, paddingBottom: 8 },
  footer: { flexDirection: 'row', gap: 10 },
});
