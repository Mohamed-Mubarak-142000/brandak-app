import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { flatPages, useSellerReturns } from '@/api/queries';
import type { ReturnStatus } from '@/api/types';
import { RETURN_STATUS, ReturnCard } from '@/features/returns/return-view';
import { useTheme } from '@/theme';
import { AppBar, Button, Chip, EmptyState, ErrorState, Screen, Skeleton } from '@/ui';

const FILTERS: (ReturnStatus | undefined)[] = [undefined, 'REQUESTED', 'APPROVED', 'RECEIVED', 'REFUNDED', 'REJECTED'];

export default function SellerReturns() {
  const t = useTheme();
  const router = useRouter();
  const [status, setStatus] = useState<ReturnStatus | undefined>('REQUESTED');
  const q = useSellerReturns(status);
  const items = flatPages(q.data);

  return (
    <Screen
      header={<AppBar title="المرتجعات" />}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((s) => (
          <Chip key={s ?? 'all'} label={s ? RETURN_STATUS[s].label : 'الكل'} selected={status === s} onPress={() => setStatus(s)} />
        ))}
      </ScrollView>
      {q.isLoading ? (
        <Skeleton height={90} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !items.length ? (
        <EmptyState art="box" title="مفيش مرتجعات هنا" body="لما عميل يطلب إرجاع، هيوصلك إشعار وتلاقيه هنا." />
      ) : (
        <>
          {items.map((r) => (
            <ReturnCard key={r.id} r={r} showCustomer onPress={() => router.push({ pathname: '/seller/returns/[id]', params: { id: r.id } })} />
          ))}
          {q.hasNextPage && <Button label="تحميل المزيد" variant="secondary" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { gap: 8 },
});
