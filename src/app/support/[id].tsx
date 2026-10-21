import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Alert, RefreshControl } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { qk, useMyTicket } from '@/api/queries';
import type { Ticket } from '@/api/types';
import { isActiveTicket, TicketThread } from '@/features/support/ticket-view';
import { useTheme } from '@/theme';
import { AppBar, Button, ErrorState, Screen, Skeleton, toast } from '@/ui';

export default function TicketScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useMyTicket(id);
  const ticket = q.data;

  const updated = (next: Ticket) => {
    qc.setQueryData(qk.ticket(id), next);
    qc.invalidateQueries({ queryKey: qk.tickets });
  };
  const close = useMutation({
    mutationFn: () => api.post<Ticket>(`/support/tickets/${id}/close`),
    onSuccess: (next) => {
      updated(next);
      toast.success('اتقفلت التذكرة');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Screen
      header={<AppBar title="التذكرة" />}
      keyboard
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
    >
      {q.isLoading ? (
        <Skeleton height={260} />
      ) : q.error || !ticket ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <TicketThread ticket={ticket} me="CUSTOMER" replyPath={`/support/tickets/${id}/messages`} onUpdated={updated} />
          {isActiveTicket(ticket) && (
            <Button
              label="مشكلتي اتحلت، اقفل التذكرة"
              variant="secondary"
              loading={close.isPending}
              onPress={() =>
                Alert.alert('تقفل التذكرة؟', 'مش هتقدر ترد فيها تاني بعد ما تتقفل.', [
                  { text: 'رجوع', style: 'cancel' },
                  { text: 'اقفلها', onPress: () => close.mutate() },
                ])
              }
            />
          )}
        </>
      )}
    </Screen>
  );
}
