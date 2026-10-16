import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { flatPages, useWishlist } from '@/api/queries';
import { ProductGrid } from '@/features/catalog/product-grid';
import { useTheme } from '@/theme';
import { AppBar, EmptyState } from '@/ui';

export default function Wishlist() {
  const t = useTheme();
  const router = useRouter();
  const q = useWishlist();
  // Unavailable items (product: null) are hidden; the API keeps them in case they come back.
  const items = flatPages(q.data)
    .map((w) => w.product)
    .filter((p): p is NonNullable<typeof p> => !!p);
  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <AppBar title="المفضلة" />
      <ProductGrid
        items={items}
        isLoading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        loadingMore={q.isFetchingNextPage}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={() => q.refetch()}
        header={<View style={{ height: 12 }} />}
        empty={
          <EmptyState art="heart" title="المفضلة فاضية" body="دوس على القلب في أي منتج عجبك وهتلاقيه هنا." action="اكتشف المنتجات" onAction={() => router.push('/explore')} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
