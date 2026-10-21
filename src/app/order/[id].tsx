import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Info, LifeBuoy, Star, Truck, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { qk, useOrder, useReturnEligibility } from '@/api/queries';
import type { OrderDetail } from '@/api/types';
import { ContactButtons, isPickupOrder, OrderAddress, OrderItems } from '@/features/orders/order-sections';
import { OrderTimeline } from '@/features/orders/timeline';
import { formatDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Card, Chip, ErrorState, Screen, Sheet, Skeleton, StatusPill, Text, TextField, toast, Icon } from '@/ui';

const CANCEL_REASONS = ['غيّرت رأيي', 'طلبت بالغلط', 'لقيته بسعر أقل', 'التوصيل هياخد وقت طويل'];

export default function OrderScreen() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useOrder(id);
  const o = q.data;
  const returns = useReturnEligibility(id, o?.status === 'DELIVERED');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const cancel = useMutation({
    mutationFn: () => api.post<OrderDetail>(`/orders/me/${id}/cancel`, { reason: reason.trim() || undefined }),
    onSuccess: (order) => {
      haptic.success();
      qc.setQueryData(qk.order(id), order);
      qc.invalidateQueries({ queryKey: ['orders'] });
      setCancelOpen(false);
      toast.success('اتلغى الطلب');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Screen
      header={<AppBar title={o ? `طلب #${o.orderNumber}` : 'تفاصيل الطلب'} />}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
      footer={
        o?.status === 'AWAITING_CONFIRMATION' ? (
          <View style={styles.footerRow}>
            <Button label="إلغاء" variant="secondary" block={false} onPress={() => setCancelOpen(true)} />
            <Button label="أكّد الطلب بالكود" onPress={() => router.push({ pathname: '/order/confirm', params: { id: o.id } })} style={styles.flex} />
          </View>
        ) : o?.status === 'DELIVERED' ? (
          <Button label="قيّم المنتجات" icon={Star} onPress={() => router.push({ pathname: '/review/[orderId]', params: { orderId: o.id } })} />
        ) : o?.status === 'PENDING' ? (
          <Button label="إلغاء الطلب" variant="secondary" onPress={() => setCancelOpen(true)} />
        ) : undefined
      }
    >
      {q.isLoading ? (
        <>
          <Skeleton height={60} />
          <Skeleton height={220} />
          <Skeleton height={160} />
        </>
      ) : q.error || !o ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <Card style={styles.headCard}>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{o.brand.name}</Text>
              <Text variant="meta" color="ink3">
                اتطلب {formatDate(o.createdAt)}
              </Text>
            </View>
            <StatusPill status={o.status} />
          </Card>

          {o.shipment && (
            <Card style={styles.track}>
              <Icon as={Truck} color="accent" />
              <View style={styles.flex}>
                <Text variant="ui" weight="bold">
                  مع {o.shipment.carrier}
                </Text>
                <Text variant="meta" color="ink2" selectable>
                  رقم الشحنة {o.shipment.trackingNumber}
                </Text>
              </View>
              {o.shipment.trackingUrl && (
                <Button label="تتبع" size="sm" variant="soft" block={false} onPress={() => WebBrowser.openBrowserAsync(o.shipment!.trackingUrl!).catch(() => undefined)} />
              )}
            </Card>
          )}

          <View style={styles.gap}>
            <Text variant="section">حالة الطلب</Text>
            <Card>
              <OrderTimeline order={o} />
            </Card>
          </View>

          {o.status === 'AWAITING_CONFIRMATION' && (
            <Banner
              icon={Info}
              tone="warning"
              title="طلبك مستني تأكيدك"
              body="بعتنالك كود على الإيميل. أكّده عشان الطلب يوصل للمتجر، وإلا هيتلغي بعد 24 ساعة."
              action="أكّد"
              onAction={() => router.push({ pathname: '/order/confirm', params: { id: o.id } })}
            />
          )}
          {o.status === 'PENDING' && <Banner icon={Info} title="تقدر تلغي الطلب مجاناً" body="الإلغاء متاح لحد ما المتجر يأكد الطلب." />}

          <View style={styles.gap}>
            <Text variant="section">المنتجات</Text>
            <OrderItems order={o} />
          </View>
          <View style={styles.gap}>
            <Text variant="section">{isPickupOrder(o) ? 'الاستلام' : 'عنوان التوصيل'}</Text>
            <OrderAddress order={o} />
          </View>
          <View style={styles.gap}>
            <Text variant="section">محتاج مساعدة؟</Text>
            <ContactButtons phone={o.brand.phone} label="المتجر" />
            {o.status === 'DELIVERED' && returns.data?.open && (
              <Button
                label={`إرجاع منتجات (لحد ${formatDate(returns.data.until!)})`}
                icon={Undo2}
                variant="secondary"
                onPress={() => router.push({ pathname: '/returns/new', params: { orderId: o.id } })}
              />
            )}
            {o.status !== 'AWAITING_CONFIRMATION' && (
              <Button label="عندي مشكلة في الطلب" icon={LifeBuoy} variant="secondary" onPress={() => router.push({ pathname: '/support/new', params: { orderId: o.id } })} />
            )}
          </View>
        </>
      )}

      <Sheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="إلغاء الطلب؟"
        footer={
          <>
            <Button label="أيوه، ألغي الطلب" variant="danger" loading={cancel.isPending} onPress={() => cancel.mutate()} />
            <Button label="لا، خليه" variant="secondary" onPress={() => setCancelOpen(false)} />
          </>
        }
      >
        <Text variant="ui" color="ink2">
          قولنا السبب عشان نحسّن التجربة (اختياري):
        </Text>
        <View style={styles.wrap}>
          {CANCEL_REASONS.map((r) => (
            <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
          ))}
        </View>
        <TextField label="سبب تاني" placeholder="اكتب السبب باختصار" optional value={CANCEL_REASONS.includes(reason) ? '' : reason} onChangeText={setReason} maxLength={200} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerRow: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  gap: { gap: 10 },
  headCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
