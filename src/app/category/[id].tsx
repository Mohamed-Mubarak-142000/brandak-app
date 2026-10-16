import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { flatPages, useCategories, useProducts } from '@/api/queries';
import { FilterBar, type ProductFilters } from '@/features/catalog/filters';
import { ProductGrid } from '@/features/catalog/product-grid';
import { useTheme } from '@/theme';
import { AppBar } from '@/ui';

export default function CategoryScreen() {
  const t = useTheme();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const categories = useCategories();
  const title = name ?? categories.data?.find((c) => c._id === id)?.nameAr ?? 'القسم';
  const [filters, setFilters] = useState<ProductFilters>({ categoryId: id });
  const q = useProducts({ ...filters, categoryId: id });

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <AppBar title={title} />
      <View style={styles.bar}>
        <FilterBar value={filters} onChange={setFilters} lockCategory />
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
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, bar: { paddingTop: 8 } });
