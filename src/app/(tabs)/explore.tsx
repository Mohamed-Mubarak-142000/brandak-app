import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownWideNarrow, LayoutGrid, Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flatPages, useBrands, useProducts } from '@/api/queries';
import type { StoreType } from '@/api/types';
import { BrandCard } from '@/features/catalog/brand-card';
import {
  ActiveChips,
  countFilters,
  FilterButton,
  ProductFilterSheet,
  productQuery,
  useProductChips,
  type ProductFilters,
  type ProductSort,
} from '@/features/catalog/filters';
import { ProductGrid } from '@/features/catalog/product-grid';
import { STORE_TYPES, storeTypeInfo } from '@/features/catalog/store-types';
import { useTheme } from '@/theme';
import { Button, EmptyState, ErrorState, Icon, Select, Sheet, Skeleton, Tap, Text } from '@/ui';

type Tab = 'products' | 'brands';
type BrandSort = 'rating' | 'newest' | 'name';
const BRAND_SORT: Record<BrandSort, string> = { rating: 'الأعلى تقييماً', newest: 'الأحدث', name: 'أبجدياً' };

interface StoreFilters {
  storeType?: StoreType;
  sort: BrandSort;
}

export default function Explore() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: Tab; sort?: ProductSort; storeType?: StoreType }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? (params.storeType ? 'brands' : 'products'));
  const [products, setProducts] = useState<ProductFilters>({ sort: params.sort });
  const [stores, setStores] = useState<StoreFilters>({ storeType: params.storeType, sort: 'rating' });
  // Explore is a mounted tab: when another screen links here with a new store type, follow it.
  const [linkedType, setLinkedType] = useState(params.storeType);
  if (params.storeType !== linkedType) {
    setLinkedType(params.storeType);
    if (params.storeType) {
      setTab('brands');
      setStores((s) => ({ ...s, storeType: params.storeType }));
    }
  }

  const [open, setOpen] = useState(false);
  // A fresh key per opening resets each sheet's draft to the applied filters.
  const [session, setSession] = useState(0);
  const productChips = useProductChips(products, setProducts);
  const storeChips = [
    ...(stores.storeType ? [{ key: 'type', label: storeTypeInfo(stores.storeType).plural, onRemove: () => setStores({ ...stores, storeType: undefined }) }] : []),
    ...(stores.sort !== 'rating' ? [{ key: 'sort', label: BRAND_SORT[stores.sort], onRemove: () => setStores({ ...stores, sort: 'rating' }) }] : []),
  ];
  const count = tab === 'products' ? countFilters(products) : storeChips.length;

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: insets.top + 6 }]}>
      <View style={styles.head}>
        <Text variant="page" accessibilityRole="header">
          استكشف
        </Text>
        <View style={styles.searchRow}>
          <Tap
            onPress={() => router.push('/search')}
            style={[styles.search, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.md }]}
            accessibilityRole="search"
            accessibilityLabel="بحث"
            pressScale={0.99}
          >
            <Icon as={Search} size={20} color="ink3" />
            <Text variant="body" color="ink3" numberOfLines={1}>
              ابحث في فاترينة...
            </Text>
          </Tap>
          <FilterButton
            count={count}
            label={tab === 'products' ? 'فلترة المنتجات' : 'فلترة المتاجر'}
            onPress={() => {
              setSession((n) => n + 1);
              setOpen(true);
            }}
          />
        </View>
        <View style={[styles.segment, { backgroundColor: t.c.sunken, borderRadius: t.radius.md }]} accessibilityRole="tablist">
          {(['products', 'brands'] as Tab[]).map((k) => (
            <Tap
              key={k}
              onPress={() => setTab(k)}
              pressScale={1}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === k }}
              style={[styles.segItem, { borderRadius: t.radius.sm + 2 }, tab === k && { backgroundColor: t.c.surface, shadowColor: t.c.shadow, shadowOpacity: 0.08, shadowRadius: 6, elevation: 1 }]}
            >
              <Text variant="ui" weight={tab === k ? 'bold' : 'medium'} color={tab === k ? 'ink' : 'ink3'}>
                {k === 'products' ? 'المنتجات' : 'المتاجر'}
              </Text>
            </Tap>
          ))}
        </View>
        <ActiveChips chips={tab === 'products' ? productChips : storeChips} />
      </View>

      {tab === 'products' ? <ProductsTab filters={products} /> : <BrandsTab filters={stores} />}

      {tab === 'products' ? (
        <ProductFilterSheet key={`p${session}`} open={open} onClose={() => setOpen(false)} value={products} onApply={setProducts} />
      ) : (
        <StoreFilterSheet key={`s${session}`} open={open} onClose={() => setOpen(false)} value={stores} onApply={setStores} />
      )}
    </View>
  );
}

function ProductsTab({ filters }: { filters: ProductFilters }) {
  const q = useProducts(productQuery(filters));
  return (
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
        header={<View style={styles.listTop} />}
      />
    </View>
  );
}

function BrandsTab({ filters }: { filters: StoreFilters }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const q = useBrands({ sort: filters.sort, storeType: filters.storeType });
  const items = flatPages(q.data);
  const w = Math.min(width, 640) - 32;
  return (
    <FlatList
      data={items}
      keyExtractor={(b) => b.id}
      renderItem={({ item }) => (
        <View style={styles.brandItem}>
          <BrandCard brand={item} width={w} />
        </View>
      )}
      contentContainerStyle={styles.brandList}
      onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
      ListEmptyComponent={
        q.isLoading ? (
          <View style={styles.gap}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={w * 0.42 + 110} radius={16} />
            ))}
          </View>
        ) : q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <EmptyState
            art="store"
            title={filters.storeType ? `لسه مفيش ${storeTypeInfo(filters.storeType).plural}` : 'لسه مفيش متاجر'}
            body="معارض ومخازن ومحلات وبراندات بتنضم كل يوم. ارجع قريب!"
          />
        )
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

/** Store filters in a bottom sheet: store type and sort, both dropdowns. */
function StoreFilterSheet({ open, onClose, value, onApply }: { open: boolean; onClose: () => void; value: StoreFilters; onApply: (f: StoreFilters) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="فلترة المتاجر"
      footer={
        <View style={styles.footer}>
          <Button
            label="عرض النتائج"
            style={styles.flex}
            onPress={() => {
              onApply(draft);
              onClose();
            }}
          />
          <Button label="مسح" variant="secondary" block={false} onPress={() => setDraft({ sort: 'rating' })} />
        </View>
      }
    >
      <Select<'ALL' | StoreType>
        label="نوع المتجر"
        sheetTitle="اختار نوع المتجر"
        value={draft.storeType ?? 'ALL'}
        onChange={(v) => setDraft({ ...draft, storeType: v === 'ALL' ? undefined : v })}
        options={[
          { value: 'ALL', label: 'كل المتاجر', icon: LayoutGrid },
          ...STORE_TYPES.map((s) => ({ value: s.type, label: s.plural, description: s.description, icon: s.icon })),
        ]}
      />
      <Select
        label="الترتيب"
        sheetTitle="رتّب المتاجر حسب"
        value={draft.sort}
        onChange={(sort) => setDraft({ ...draft, sort })}
        options={(Object.keys(BRAND_SORT) as BrandSort[]).map((s) => ({ value: s, label: BRAND_SORT[s], icon: ArrowDownWideNarrow }))}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderWidth: 1 },
  segment: { flexDirection: 'row', padding: 4 },
  segItem: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  listTop: { height: 8 },
  brandList: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },
  brandItem: { marginBottom: 14 },
  gap: { gap: 14 },
  footer: { flexDirection: 'row', gap: 10 },
});
