import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { flatPages, useFollowedBrands, useFollowingFeed } from '@/api/queries';
import { BrandLogo } from '@/features/catalog/brand-card';
import { ProductGrid } from '@/features/catalog/product-grid';
import { useTheme } from '@/theme';
import { AppBar, EmptyState, Tap, Text } from '@/ui';

/** Stores the customer follows and their newest products. */
export default function Following() {
  const t = useTheme();
  const router = useRouter();
  const brands = useFollowedBrands();
  const feed = useFollowingFeed();

  const header = (
    <View style={styles.header}>
      {!!brands.data?.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brands}>
          {brands.data.map((b) => (
            <Tap key={b.id} onPress={() => router.push({ pathname: '/brand/[slug]', params: { slug: b.slug } })} style={styles.brand} accessibilityLabel={b.name}>
              <BrandLogo uri={b.logoUrl} size={60} name={b.name} />
              <Text variant="meta" numberOfLines={1} align="center">
                {b.name}
              </Text>
            </Tap>
          ))}
        </ScrollView>
      )}
      {!!brands.data?.length && <Text variant="section">جديد المتاجر</Text>}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <AppBar title="متاجر بتابعها" />
      <ProductGrid
        items={flatPages(feed.data)}
        isLoading={feed.isLoading}
        error={feed.error}
        onRetry={() => feed.refetch()}
        onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
        loadingMore={feed.isFetchingNextPage}
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        onRefresh={() => {
          void brands.refetch();
          void feed.refetch();
        }}
        header={header}
        empty={
          brands.data?.length ? (
            <EmptyState art="box" title="لسه مفيش منتجات جديدة" body="أول ما المتاجر اللي بتتابعها تنزّل منتجات، هتلاقيها هنا." />
          ) : (
            <EmptyState art="heart" title="لسه مش متابع متاجر" body="افتح أي متجر عجبك ودوس «تابع المتجر» عشان يوصلك جديده وعروضه." action="اكتشف المتاجر" onAction={() => router.push({ pathname: '/explore', params: { tab: 'brands' } })} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: 12, paddingTop: 12 },
  brands: { gap: 14 },
  brand: { width: 72, alignItems: 'center', gap: 4 },
});
