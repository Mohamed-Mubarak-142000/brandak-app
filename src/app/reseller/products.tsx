import { HandCoins } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { flatPages, useProducts } from '@/api/queries';
import { ProductGrid } from '@/features/catalog/product-grid';
import { useTheme } from '@/theme';
import { AppBar, Banner, EmptyState } from '@/ui';

/** Products from stores that work with resellers. */
export default function ResellerProducts() {
  const t = useTheme();
  const q = useProducts({ resellable: true, sort: 'popular' });
  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <AppBar title="منتجات تقدر تبيعها" />
      <ProductGrid
        items={flatPages(q.data)}
        isLoading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        loadingMore={q.isFetchingNextPage}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={() => q.refetch()}
        header={
          <View style={styles.header}>
            <Banner icon={HandCoins} title="السعر ده سعر المتجر" body="بيع بسعرك لحد الضعف، والفرق ربحك. صوّر المنتج وانشره على صفحتك." />
          </View>
        }
        empty={<EmptyState art="box" title="مفيش منتجات دلوقتي" body="لما متاجر تفعّل البيع للمسوّقين، منتجاتها هتظهر هنا." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, header: { paddingTop: 12 } });
