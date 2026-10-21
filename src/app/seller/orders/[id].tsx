import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Ban, CircleCheck, PackageCheck, PackageX, ShieldAlert, ShieldCheck, Truck, User } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { qk, useSellerOrder } from '@/api/queries';
import type { OrderDetail, OrderStatus } from '@/api/types';
import { ContactButtons, OrderAddress, OrderItems } from '@/features/orders/order-sections';
import { OrderTimeline } from '@/features/orders/timeline';
import { formatDateTime, formatMoney, formatPhone } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Button, Card, Chip, ErrorState, Icon, Screen, Sheet, Skeleton, StatusPill, Tap, Text, TextField, toast } from '@/ui';

const NEXT_LABEL: Partial<Record<OrderStatus, { label: string; icon: typeof Truck }>> = {
  CONFIRMED: { label: 'تأكيد الطلب', icon: CircleCheck },
  PROCESSING: { label: 'بدء التجهيز', icon: PackageCheck },
  SHIPPED: { label: 'تم الشحن', icon: Truck },
  DELIVERED: { label: 'تم التوصيل', icon: CircleCheck },
};
const TRUST_COPY = {
  NEW: { title: 'عميل جديد', body: 'أول طلب ليه على فاترينة، وأكّده بكود على الإيميل.', tone: 'ink2' as const },
  GOOD: { title: 'عميل موثوق', body: 'بيستلم طلباته.', tone: 'success' as const },
  RISKY: { title: 'انتبه: رفض استلام قبل كده', body: 'اتأكد منه بالتليفون قبل ما تشحن.', tone: 'danger' as const },
};
const CANCEL_REASONS = ['المنتج خلص', 'العميل مش بيرد', 'العنوان خارج التغطية', 'طلب مكرر'];

export default function SellerOrder() {
  const t = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useSellerOrder(id);
  const o = q.data;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [note, setNote] = useState('');

  const move = useMutation({
    mutationFn: (body: { status: OrderStatus; note?: string; shipment?: { carrier: string; trackingNumber: string; trackingUrl?: string } }) =>
      api.patch<OrderDetail>(`/brand/orders/${id}/status`, body),
    onSuccess: (order) => {
      haptic.success();
      qc.setQueryData(qk.sellerOrder(id), order);
      qc.invalidateQueries({ queryKey: ['seller', 'orders'] });
      qc.invalidateQueries({ queryKey: ['seller', 'overview'] });
      setCancelOpen(false);
      setShipOpen(false);
      toast.success(`الطلب دلوقتي: ${order.statusLabelAr}`);
    },
    onError: (e) => {
      haptic.error();
      toast.error(errorMessage(e));
    },
  });

  const next = o?.allowedNextStatuses.find((s) => s !== 'CANCELLED' && s !== 'REFUSED');
  const canCancel = o?.allowedNextStatuses.includes('CANCELLED');
  const canRefuse = o?.allowedNextStatuses.includes('REFUSED');

  const block = useMutation({
    mutationFn: () => api.post(`/brand/orders/${id}/block-customer`, { note: 'من شاشة الطلب' }),
    onSuccess: () => {
      haptic.success();
      toast.success('العميل ده مش هيقدر يطلب من متجرك تاني');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Screen
      header={<AppBar title={o ? `طلب #${o.orderNumber}` : 'الطلب'} />}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
      footer={
        o && (next || canCancel || canRefuse) ? (
          <View style={styles.footer}>
            {canCancel && <Button label="إلغاء" variant="secondary" block={false} onPress={() => setCancelOpen(true)} />}
            {canRefuse && (
              <Button
                label="رفض الاستلام"
                icon={PackageX}
                variant="secondary"
                block={false}
                loading={move.isPending}
                onPress={() =>
                  Alert.alert('العميل رفض الاستلام؟', 'المخزون هيرجع، ومفيش عمولة على الطلب ده، وده هيتسجل في سجل العميل.', [
                    { text: 'رجوع', style: 'cancel' },
                    { text: 'أيوه، رفض', style: 'destructive', onPress: () => move.mutate({ status: 'REFUSED' }) },
                  ])
                }
              />
            )}
            {next && NEXT_LABEL[next] && (
              <Button
                label={NEXT_LABEL[next]!.label}
                icon={NEXT_LABEL[next]!.icon}
                loading={move.isPending && !cancelOpen}
                // Shipping asks for the tracking number so the customer can follow the parcel.
                onPress={() => (next === 'SHIPPED' ? setShipOpen(true) : move.mutate({ status: next }))}
                style={styles.flex}
              />
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
            {o.customerTrust && (
              <View style={[styles.trust, { backgroundColor: o.customerTrust.level === 'RISKY' ? t.c.dangerSoft : t.c.sunken, borderRadius: t.radius.md }]}>
                <Icon as={o.customerTrust.level === 'RISKY' ? ShieldAlert : ShieldCheck} color={TRUST_COPY[o.customerTrust.level].tone === 'ink2' ? 'ink2' : TRUST_COPY[o.customerTrust.level].tone} />
                <View style={styles.flex}>
                  <Text variant="ui" weight="bold" color={TRUST_COPY[o.customerTrust.level].tone}>
                    {TRUST_COPY[o.customerTrust.level].title}
                  </Text>
                  <Text variant="meta" color="ink2">
                    {o.customerTrust.delivered + o.customerTrust.refused > 0
                      ? `استلم ${o.customerTrust.delivered} من ${o.customerTrust.delivered + o.customerTrust.refused} طلب من كل المتاجر. `
                      : ''}
                    {TRUST_COPY[o.customerTrust.level].body}
                  </Text>
                </View>
              </View>
            )}
            <Tap
              pressScale={1}
              hitSlop={8}
              style={styles.blockRow}
              onPress={() =>
                Alert.alert('حظر العميل ده؟', 'مش هيقدر يطلب من متجرك تاني. تقدر تلغي الحظر من إعدادات المتجر.', [
                  { text: 'رجوع', style: 'cancel' },
                  { text: 'حظر', style: 'destructive', onPress: () => block.mutate() },
                ])
              }
            >
              <Icon as={Ban} size={16} color="ink3" />
              <Text variant="meta" color="ink3">
                حظر العميل
              </Text>
            </Tap>
          </Card>
          {o.shipment && (
            <Card style={styles.commission}>
              <Icon as={Truck} color="accent" />
              <Text variant="ui" style={styles.flex}>
                {o.shipment.carrier} · {o.shipment.trackingNumber}
              </Text>
            </Card>
          )}
          {o.coupon && (
            <Card style={styles.commission}>
              <Text variant="ui" color="ink2" style={styles.flex}>
                كوبون {o.coupon.code}
                {o.coupon.fundedBy === 'PLATFORM' ? ' (على حساب فاترينة، هيترد لك)' : ''}
              </Text>
              <Text variant="bodyStrong">- {formatMoney(o.coupon.discount)}</Text>
            </Card>
          )}
          {o.commission && (
            <Card style={styles.commission}>
              <Text variant="ui" color="ink2" style={styles.flex}>
                عمولة فاترينة ({Math.round(o.commission.rate * 1000) / 10}% من {formatMoney(o.commission.base)})
              </Text>
              <Text variant="bodyStrong">{formatMoney(o.commission.amount)}</Text>
            </Card>
          )}

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
        open={shipOpen}
        onClose={() => setShipOpen(false)}
        title="شحن الطلب"
        footer={
          <View style={styles.footer}>
            <Button label="من غير رقم شحنة" variant="secondary" block={false} onPress={() => move.mutate({ status: 'SHIPPED' })} />
            <Button
              label="تم الشحن"
              icon={Truck}
              disabled={!carrier.trim() || tracking.trim().length < 3}
              loading={move.isPending}
              onPress={() =>
                move.mutate({
                  status: 'SHIPPED',
                  shipment: { carrier: carrier.trim(), trackingNumber: tracking.trim(), trackingUrl: /^https?:\/\//.test(trackingUrl.trim()) ? trackingUrl.trim() : undefined },
                })
              }
              style={styles.flex}
            />
          </View>
        }
      >
        <Text variant="ui" color="ink2">
          رقم الشحنة بيظهر للعميل عشان يتابع طلبه.
        </Text>
        <View style={styles.wrap}>
          {['بوسطة', 'أرامكس', 'J&T', 'مايلرز', 'البريد المصري', 'مندوب المتجر'].map((c) => (
            <Chip key={c} label={c} selected={carrier === c} onPress={() => setCarrier(c)} />
          ))}
        </View>
        <TextField label="شركة الشحن" value={carrier} onChangeText={setCarrier} maxLength={40} />
        <TextField label="رقم الشحنة" value={tracking} onChangeText={setTracking} ltr maxLength={60} />
        <TextField label="لينك التتبع" optional value={trackingUrl} onChangeText={setTrackingUrl} ltr autoCapitalize="none" keyboardType="url" placeholder="https://" />
      </Sheet>

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
  trust: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', height: 32 },
  commission: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
