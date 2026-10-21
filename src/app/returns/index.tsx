import { useRouter } from 'expo-router';
import { RefreshControl } from 'react-native';

import { flatPages, useMyReturns } from '@/api/queries';
import { ReturnCard } from '@/features/returns/return-view';
import { useTheme } from '@/theme';
import { AppBar, Button, EmptyState, ErrorState, Screen, Skeleton } from '@/ui';

export default function MyReturns() {
  const t = useTheme();
  const router = useRouter();
  const q = useMyReturns();
  const items = flatPages(q.data);

  return (
    <Screen
      header={<AppBar title="مرتجعاتي" />}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
    >
      {q.isLoading ? (
        <Skeleton height={90} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !items.length ? (
        <EmptyState art="box" title="مفيش مرتجعات" body="لو عايز ترجع منتج، افتح الطلب بعد ما يوصلك واختار «إرجاع منتجات»." />
      ) : (
        <>
          {items.map((r) => (
            <ReturnCard key={r.id} r={r} onPress={() => router.push({ pathname: '/returns/[id]', params: { id: r.id } })} />
          ))}
          {q.hasNextPage && <Button label="تحميل المزيد" variant="secondary" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />}
        </>
      )}
    </Screen>
  );
}
