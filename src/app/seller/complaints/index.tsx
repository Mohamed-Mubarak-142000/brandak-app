import { useRouter } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { flatPages, useSellerTickets } from '@/api/queries';
import { TicketCard } from '@/features/support/ticket-view';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, EmptyState, ErrorState, Screen, Skeleton } from '@/ui';

/** Buyer-protection complaints about the store's orders. */
export default function SellerComplaints() {
  const t = useTheme();
  const router = useRouter();
  const q = useSellerTickets();
  const items = flatPages(q.data);
  const [now] = useState(() => Date.now());

  return (
    <Screen
      header={<AppBar title="شكاوى العملاء" />}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
    >
      <Banner
        icon={ShieldAlert}
        tone="warning"
        title="رد خلال 48 ساعة"
        body="الشكوى اللي ملهاش رد بتروح لدعم فاترينة يحكم فيها. 3 أحكام ضد المتجر بتوقفه مؤقتاً."
      />
      {q.isLoading ? (
        <Skeleton height={90} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !items.length ? (
        <EmptyState art="empty" title="مفيش شكاوى" body="ممتاز! كمّل كده." />
      ) : (
        <>
          {items.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} now={now} onPress={() => router.push({ pathname: '/seller/complaints/[id]', params: { id: ticket.id } })} />
          ))}
          {q.hasNextPage && <Button label="تحميل المزيد" variant="secondary" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />}
        </>
      )}
    </Screen>
  );
}
