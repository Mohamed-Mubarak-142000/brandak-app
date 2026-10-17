import { useLocalSearchParams, useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flatPages, useBrands, useProducts } from '@/api/queries';
import { BrandCard } from '@/features/catalog/brand-card';
import { FilterBar, type ProductFilters, type ProductSort } from '@/features/catalog/filters';
import { ProductGrid } from '@/features/catalog/product-grid';
import { useTheme } from '@/theme';
import { Chip, EmptyState, ErrorState, Icon, Skeleton, Tap, Text } from '@/ui';

type Tab = 'products' | 'brands';
type BrandSort = 'rating' | 'newest' | 'name';
const BRAND_SORT: Record<BrandSort, string> = { rating: 'الأعلى تقييماً', newest: 'الأحدث', name: 'أبجدياً' };

export default function Explore() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: Tab; sort?: ProductSort }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'products');
  const [filters, setFilters] = useState<ProductFilters>({ sort: params.sort });

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: insets.top + 6 }]}>
      <View style={styles.head}>
        <Text variant="page" accessibilityRole="header">
          استكشف
        </Text>
        <Tap
          onPress={() => router.push('/search')}
          style={[styles.search, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.md }]}
          accessibilityRole="search"
          accessibilityLabel="بحث"
          pressScale={0.99}
        >
          <Icon as={Search} size={20} color="ink3" />
          <Text variant="body" color="ink3">
            ابحث في براندك...
          </Text>
        </Tap>
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
      </View>
      {tab === 'products' ? <ProductsTab filters={filters} setFilters={setFilters} /> : <BrandsTab />}
    </View>
  );
}

function ProductsTab({ filters, setFilters }: { filters: ProductFilters; setFilters: (f: ProductFilters) => void }) {
  const q = useProducts({ ...filters });
  return (
    <View style={styles.flex}>
      <FilterBar value={filters} onChange={setFilters} />
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
          header={<View style={{ height: 12 }} />}
        />
      </View>
    </View>
  );
}

function BrandsTab() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [sort, setSort] = useState<BrandSort>('rating');
  const q = useBrands({ sort });
  const items = flatPages(q.data);
  const w = Math.min(width, 640) - 32;
  return (
    <View style={styles.flex}>
      <View style={styles.chips}>
        {(Object.keys(BRAND_SORT) as BrandSort[]).map((s) => (
          <Chip key={s} label={BRAND_SORT[s]} selected={sort === s} onPress={() => setSort(s)} />
        ))}
      </View>
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <View style={styles.brandItem}>
            <BrandCard brand={item} width={w} />
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 }}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
        ListEmptyComponent={
          q.isLoading ? (
            <View style={{ gap: 14 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={w * 0.42 + 110} radius={16} />
              ))}
            </View>
          ) : q.error ? (
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          ) : (
            <EmptyState art="store" title="لسه مفيش متاجر" body="معارض ومخازن ومحلات وبراندات بتنضم كل يوم. ارجع قريب!" />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderWidth: 1 },
  segment: { flexDirection: 'row', padding: 4 },
  segItem: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  brandItem: { marginBottom: 14 },
});
