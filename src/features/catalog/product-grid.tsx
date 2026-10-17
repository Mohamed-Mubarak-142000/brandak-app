import type { ReactElement } from 'react';
import { FlatList, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { ProductCard as Product } from '@/api/types';
import { useTheme } from '@/theme';
import { EmptyState, ErrorState, Skeleton } from '@/ui';
import { CARD_ASPECT, ProductCard } from './product-card';

const GAP = 12;
const PAD = 16;

export function useCardWidth(columns = 2) {
  const { width } = useWindowDimensions();
  return Math.floor((Math.min(width, 640) - PAD * 2 - GAP * (columns - 1)) / columns);
}

export function ProductSkeleton({ width }: { width: number }) {
  return (
    <View style={{ width, gap: 6 }}>
      <Skeleton width={width} height={width * CARD_ASPECT} radius={16} />
      <Skeleton width="50%" height={12} />
      <Skeleton width="90%" height={14} />
      <Skeleton width="40%" height={14} />
    </View>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  const w = useCardWidth();
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: count }, (_, i) => (
        <ProductSkeleton key={i} width={w} />
      ))}
    </View>
  );
}

/** Two-column virtualised product grid with infinite scroll, pull-to-refresh and all states. */
export function ProductGrid({
  items,
  isLoading,
  error,
  onRetry,
  onEndReached,
  loadingMore,
  refreshing,
  onRefresh,
  header,
  empty,
}: {
  items: Product[];
  isLoading: boolean;
  error?: unknown;
  onRetry?: () => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  header?: ReactElement;
  empty?: ReactElement;
}) {
  const t = useTheme();
  const w = useCardWidth();
  return (
    <FlatList
      data={isLoading || error ? [] : items}
      numColumns={2}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <ProductCard product={item} width={w} />
        </View>
      )}
      columnWrapperStyle={styles.columns}
      initialNumToRender={6}
      windowSize={7}
      removeClippedSubviews
      contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 32 }}
      ListHeaderComponent={header}
      ListEmptyComponent={
        isLoading ? (
          <GridSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : (
          empty ?? <EmptyState art="search" title="مفيش منتجات هنا لسه" body="جرّب فلاتر تانية أو ارجع بعدين." />
        )
      }
      ListFooterComponent={loadingMore ? <GridSkeleton count={2} /> : undefined}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.c.brand} colors={[t.c.brand]} /> : undefined}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    />
  );
}

const styles = StyleSheet.create({
  cell: { marginBottom: 20 },
  columns: { gap: GAP },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, rowGap: 20, paddingTop: 4 },
});
