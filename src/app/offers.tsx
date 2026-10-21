import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { flatPages, useCampaigns, useProducts } from '@/api/queries';
import { Countdown } from '@/features/catalog/countdown';
import { ProductGrid } from '@/features/catalog/product-grid';
import { useTheme } from '@/theme';
import { AppBar, Text } from '@/ui';

/**
 * Products on sale right now, biggest discounts first. With ?campaign=<slug> it shows one
 * season (White Friday, Ramadan...) and its countdown.
 */
export default function Offers() {
  const t = useTheme();
  const { campaign: slug } = useLocalSearchParams<{ campaign?: string }>();
  const campaigns = useCampaigns();
  const season = slug ? campaigns.data?.find((c) => c.slug === slug) : undefined;
  const q = useProducts(season ? { campaignId: season._id, sort: 'discount' } : { onSale: true, sort: 'discount' }, 20, !slug || !!season);
  const [now] = useState(() => Date.now());
  const started = season && new Date(season.startsAt).getTime() <= now;

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <AppBar title={season?.nameAr ?? 'عروض النهارده'} />
      <View style={styles.flex}>
        <ProductGrid
          items={flatPages(q.data)}
          isLoading={q.isLoading || (!!slug && campaigns.isLoading)}
          error={q.error}
          onRetry={() => q.refetch()}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          loadingMore={q.isFetchingNextPage}
          refreshing={q.isRefetching && !q.isFetchingNextPage}
          onRefresh={() => q.refetch()}
          header={
            season ? (
              <View style={[styles.hero, { backgroundColor: season.color, borderRadius: t.radius.lg }]}>
                <Text variant="page" style={styles.onColor}>
                  {season.nameAr}
                </Text>
                {!!season.descriptionAr && (
                  <Text variant="ui" style={styles.onColor}>
                    {season.descriptionAr}
                  </Text>
                )}
                {started ? <Countdown endsAt={season.endsAt} prefix="الموسم بيخلص خلال" /> : <Countdown endsAt={season.startsAt} prefix="بيبدأ خلال" />}
              </View>
            ) : (
              <Text variant="ui" color="ink2" style={styles.lead}>
                خصومات لفترة محدودة من متاجر فاترينة. الأكبر خصماً الأول.
              </Text>
            )
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { padding: 18, gap: 8, marginBottom: 8 },
  onColor: { color: '#fff' },
  lead: { paddingBottom: 8 },
});
