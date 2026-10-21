import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Info } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { qk, useSellerReturn } from '@/api/queries';
import type { ReturnRequest } from '@/api/types';
import { ReturnDetails } from '@/features/returns/return-view';
import { formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, ErrorState, Screen, Sheet, Skeleton, Text, TextField, toast } from '@/ui';

type Action = 'approve' | 'reject' | 'received' | 'refunded';

const CONFIRM: Record<Action, { title: string; body: string; label: string; noteRequired?: boolean }> = {
  approve: { title: 'موافقة على الإرجاع', body: 'اكتب للعميل إزاي هيوصلك المنتج (مندوب، أو يبعته على عنوان).', label: 'موافقة' },
  reject: { title: 'رفض الإرجاع', body: 'اكتب السبب بوضوح. العميل يقدر يشتكي لدعم فاترينة لو شاف الرفض مش في محله.', label: 'رفض', noteRequired: true },
  received: { title: 'استلمت المنتجات', body: 'الكمية هترجع للمخزون تلقائياً.', label: 'تأكيد الاستلام' },
  refunded: { title: 'رجّعت الفلوس', body: 'أكّد إنك رجّعت المبلغ للعميل. عمولة فاترينة على المنتجات دي بترجعلك.', label: 'تأكيد' },
};

export default function SellerReturn() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useSellerReturn(id);
  const r = q.data;
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState('');

  const move = useMutation({
    mutationFn: (a: Action) => api.post<ReturnRequest>(`/brand/returns/${id}/${a}`, { note: note.trim() || undefined }),
    onSuccess: (data) => {
      haptic.success();
      qc.setQueryData(qk.sellerReturn(id), data);
      qc.invalidateQueries({ queryKey: ['seller', 'returns'] });
      setAction(null);
      setNote('');
      toast.success('اتحدّث طلب الإرجاع');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const footer =
    r?.status === 'REQUESTED' ? (
      <View style={styles.row}>
        <Button label="رفض" variant="secondary" block={false} onPress={() => setAction('reject')} />
        <Button label="موافقة" onPress={() => setAction('approve')} style={styles.flex} />
      </View>
    ) : r?.status === 'APPROVED' ? (
      <Button label="استلمت المنتجات" onPress={() => setAction('received')} />
    ) : r?.status === 'RECEIVED' ? (
      <Button label={`رجّعت ${formatMoney(r.refundAmount)} للعميل`} onPress={() => setAction('refunded')} />
    ) : undefined;

  const c = action ? CONFIRM[action] : null;
  return (
    <Screen
      header={<AppBar title="طلب إرجاع" />}
      keyboard
      footer={footer}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
    >
      {q.isLoading ? (
        <Skeleton height={260} />
      ) : q.error || !r ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <Text variant="bodyStrong">{r.customerName}</Text>
          {r.status === 'REFUNDED' && r.commissionReversed > 0 && (
            <Banner icon={Info} tone="success" title={`رجعلك ${formatMoney(r.commissionReversed)} من العمولة`} body="اتخصمت من حسابك مع فاترينة." />
          )}
          <ReturnDetails r={r} />
          <Button label="فتح الطلب" variant="secondary" onPress={() => router.push({ pathname: '/seller/orders/[id]', params: { id: r.orderId } })} />
        </>
      )}

      <Sheet
        open={!!c}
        onClose={() => setAction(null)}
        title={c?.title ?? ''}
        footer={
          <Button
            label={c?.label ?? ''}
            variant={action === 'reject' ? 'danger' : 'primary'}
            loading={move.isPending}
            disabled={!!c?.noteRequired && note.trim().length < 3}
            onPress={() => action && move.mutate(action)}
          />
        }
      >
        <Text variant="ui" color="ink2">
          {c?.body}
        </Text>
        <TextField label={c?.noteRequired ? 'السبب' : 'رسالة للعميل'} optional={!c?.noteRequired} multiline value={note} onChangeText={setNote} maxLength={500} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },
});
