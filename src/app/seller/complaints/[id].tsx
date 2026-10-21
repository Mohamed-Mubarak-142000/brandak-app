import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl } from 'react-native';

import { qk, useSellerTicket } from '@/api/queries';
import type { Ticket } from '@/api/types';
import { TicketThread } from '@/features/support/ticket-view';
import { useTheme } from '@/theme';
import { AppBar, Button, ErrorState, Screen, Skeleton } from '@/ui';

export default function SellerComplaint() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useSellerTicket(id);
  const ticket = q.data;

  const updated = (next: Ticket) => {
    qc.setQueryData(qk.sellerTicket(id), next);
    qc.invalidateQueries({ queryKey: qk.sellerTickets });
  };

  return (
    <Screen
      header={<AppBar title="شكوى عميل" />}
      keyboard
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
    >
      {q.isLoading ? (
        <Skeleton height={260} />
      ) : q.error || !ticket ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <TicketThread ticket={ticket} me="BRAND" replyPath={`/brand/tickets/${id}/messages`} onUpdated={updated} />
          {ticket.orderId && (
            <Button label="فتح الطلب" variant="secondary" onPress={() => router.push({ pathname: '/seller/orders/[id]', params: { id: ticket.orderId! } })} />
          )}
        </>
      )}
    </Screen>
  );
}
