import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserX } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import type { BlockedCustomer } from '@/api/types';
import { formatDate, formatPhone } from '@/lib/format';
import { AppBar, Button, Card, EmptyState, ErrorState, Icon, Screen, Skeleton, Text, toast } from '@/ui';

const KEY = ['seller', 'blocks'] as const;

/** Customers this store refused to sell to (blocked from an order screen). */
export default function Blocks() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: KEY, queryFn: () => api.get<BlockedCustomer[]>('/brand/blocks') });
  const unblock = useMutation({
    mutationFn: (id: string) => api.del(`/brand/blocks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('اتلغى الحظر');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Screen header={<AppBar title="العملاء المحظورين" />}>
      {q.isLoading ? (
        <Skeleton height={120} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState art="box" title="مفيش عملاء محظورين" body="تقدر تحظر عميل من شاشة الطلب، لو رفض الاستلام أو اتعامل بشكل مش لطيف." />
      ) : (
        q.data.map((b) => (
          <Card key={b.id} style={styles.row}>
            <Icon as={UserX} color="ink3" />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{b.customer.name}</Text>
              <Text variant="meta" color="ink3">
                {formatPhone(b.customer.phone)} · من {formatDate(b.createdAt)}
              </Text>
            </View>
            <Button label="إلغاء الحظر" size="sm" variant="secondary" block={false} loading={unblock.isPending && unblock.variables === b.id} onPress={() => unblock.mutate(b.id)} />
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
