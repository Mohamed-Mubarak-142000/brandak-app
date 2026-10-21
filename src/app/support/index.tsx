import { useRouter } from 'expo-router';
import { LifeBuoy, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { flatPages, useMyTickets } from '@/api/queries';
import { TicketCard } from '@/features/support/ticket-view';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, EmptyState, ErrorState, Screen, Skeleton } from '@/ui';

/** The customer's tickets with Fatrina support and buyer-protection cases. */
export default function Support() {
  const t = useTheme();
  const router = useRouter();
  const q = useMyTickets();
  const items = flatPages(q.data);
  const [now] = useState(() => Date.now());

  return (
    <Screen
      header={<AppBar title="الدعم والشكاوى" end={<Button label="تذكرة جديدة" icon={LifeBuoy} size="sm" block={false} onPress={() => router.push('/support/new')} />} />}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
    >
      <Banner icon={ShieldCheck} title="حماية فاترينة" body="لو طلبك موصلش أو طلع مختلف عن الصور، افتح شكوى. المتجر قدامه 48 ساعة يرد، وبعدها إحنا بنحكم." />
      {q.isLoading ? (
        <Skeleton height={90} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !items.length ? (
        <EmptyState art="empty" title="مفيش تذاكر" body="محتاج مساعدة في طلب أو في حسابك؟ احنا هنا." action="تذكرة جديدة" onAction={() => router.push('/support/new')} />
      ) : (
        <>
          {items.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} now={now} onPress={() => router.push({ pathname: '/support/[id]', params: { id: ticket.id } })} />
          ))}
          {q.hasNextPage && <Button label="تحميل المزيد" variant="secondary" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />}
        </>
      )}
    </Screen>
  );
}
