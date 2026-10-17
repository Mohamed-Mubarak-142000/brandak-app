import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { CircleCheck, PackageCheck, Truck, User } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { qk, useSellerOrder } from '@/api/queries';
import type { OrderDetail, OrderStatus } from '@/api/types';
import { ContactButtons, OrderAddress, OrderItems } from '@/features/orders/order-sections';
import { OrderTimeline } from '@/features/orders/timeline';
import { formatDateTime, formatPhone } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Button, Card, Chip, ErrorState, Icon, Screen, Sheet, Skeleton, StatusPill, Text, TextField, toast } from '@/ui';

const NEXT_LABEL: Partial<Record<OrderStatus, { label: string; icon: typeof Truck }>> = {
  CONFIRMED: { label: 'تأكيد الطلب', icon: CircleCheck },
  PROCESSING: { label: 'بدء التجهيز', icon: PackageCheck },
  SHIPPED: { label: 'تم الشحن', icon: Truck },
  DELIVERED: { label: 'تم التوصيل', icon: CircleCheck },
};
const CANCEL_REASONS = ['المنتج خلص', 'العميل مش بيرد', 'العنوان خارج التغطية', 'طلب مكرر'];

export default function SellerOrder() {
  const t = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useSellerOrder(id);
  const o = q.data;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState('');

  const move = useMutation({
    mutationFn: (body: { status: OrderStatus; note?: string }) => api.patch<OrderDetail>(`/brand/orders/${id}/status`, body),
    onSuccess: (order) => {
      haptic.success();
      qc.setQueryData(qk.sellerOrder(id), order);
      qc.invalidateQueries({ queryKey: ['seller', 'orders'] });
      qc.invalidateQueries({ queryKey: ['seller', 'overview'] });
      setCancelOpen(false);
      toast.success(`الطلب دلوقتي: ${order.statusLabelAr}`);
    },
    onError: (e) => {
      haptic.error();
      toast.error(errorMessage(e));
    },
  });

  const next = o?.allowedNextStatuses.find((s) => s !== 'CANCELLED');
  const canCancel = o?.allowedNextStatuses.includes('CANCELLED');

  return (
    <Screen
      header={<AppBar title={o ? `طلب #${o.orderNumber}` : 'الطلب'} />}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
      footer={
        o && (next || canCancel) ? (
          <View style={styles.footer}>
            {canCancel && <Button label="إلغاء" variant="secondary" block={false} onPress={() => setCancelOpen(true)} />}
            {next && NEXT_LABEL[next] && (
              <Button label={NEXT_LABEL[next]!.label} icon={NEXT_LABEL[next]!.icon} loading={move.isPending && !cancelOpen} onPress={() => move.mutate({ status: next })} style={styles.flex} />
            )}
          </View>
        ) : undefined
      }
    >
      {q.isLoading ? (
        <>
          <Skeleton height={80} />
          <Skeleton height={240} />
        </>
      ) : q.error || !o ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <Card style={styles.head}>
            <View style={styles.flex}>
              <Text variant="meta" color="ink3">
                {formatDateTime(o.createdAt)}
              </Text>
              <Text variant="section">{o.statusLabelAr}</Text>
            </View>
            <StatusPill status={o.status} />
          </Card>

          <Card style={styles.gap}>
            <View style={styles.inline}>
              <Icon as={User} size={18} color="accent" />
              <Text variant="bodyStrong">{o.customer?.name}</Text>
            </View>
            <Text variant="ui" color="ink2">
              {formatPhone(o.customer?.phone)}
            </Text>
            <ContactButtons phone={o.customer?.phone} label="العميل" />
          </Card>

          <View style={styles.gap}>
            <Text variant="section">المنتجات</Text>
            <OrderItems order={o} />
          </View>
          <View style={styles.gap}>
            <Text variant="section">التوصيل</Text>
            <OrderAddress order={o} />
          </View>
          <View style={styles.gap}>
            <Text variant="section">السجل</Text>
            <Card>
              <OrderTimeline order={o} />
            </Card>
          </View>
        </>
      )}

      <Sheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="إلغاء الطلب"
        footer={
          <Button
            label="تأكيد الإلغاء"
            variant="danger"
            disabled={!note.trim()}
            loading={move.isPending}
            onPress={() => move.mutate({ status: 'CANCELLED', note: note.trim() })}
          />
        }
      >
        <Text variant="ui" color="ink2">
          السبب هيظهر للعميل، والمخزون هيرجع تلقائياً.
        </Text>
        <View style={styles.wrap}>
          {CANCEL_REASONS.map((r) => (
            <Chip key={r} label={r} selected={note === r} onPress={() => setNote(r)} />
          ))}
        </View>
        <TextField label="سبب الإلغاء" placeholder="اكتب السبب اللي هيظهر للعميل" value={note} onChangeText={setNote} maxLength={300} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { flexDirection: 'row', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
