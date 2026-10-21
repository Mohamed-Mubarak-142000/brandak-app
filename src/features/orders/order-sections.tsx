import { Image } from 'expo-image';
import { MapPin, MessageCircle, Phone, Store } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import type { OrderDetail } from '@/api/types';
import { addressLine } from '@/features/checkout/address-card';
import { formatMoney, formatPhone } from '@/lib/format';
import { useTheme } from '@/theme';
import { Button, Card, Divider, Icon, Text } from '@/ui';

export function OrderItems({ order }: { order: OrderDetail }) {
  const t = useTheme();
  return (
    <Card style={styles.gap}>
      {order.items.map((it) => (
        <View key={`${it.productId}-${it.variantId}`} style={styles.line}>
          <Image source={it.imageUrl} style={[styles.thumb, { backgroundColor: t.c.sunken }]} contentFit="cover" />
          <View style={styles.flex}>
            <Text variant="ui" numberOfLines={2}>
              {it.title}
            </Text>
            <Text variant="meta" color="ink3">
              {[it.size, it.color, `${it.quantity} × ${formatMoney(it.unitPrice)}`].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text variant="ui" weight="semibold">
            {formatMoney(it.lineTotal)}
          </Text>
        </View>
      ))}
      <Divider />
      <Row label="المنتجات" value={formatMoney(order.subtotal)} />
      <Row label="الشحن" value={order.shippingFee ? formatMoney(order.shippingFee) : 'مجاني'} />
      {!!order.coupon?.discount && <Row label={`كود ${order.coupon.code}`} value={`- ${formatMoney(order.coupon.discount)}`} />}
      {!!order.points?.discount && <Row label={`خصم ${order.points.used} نقطة`} value={`- ${formatMoney(order.points.discount)}`} />}
      {!order.coupon && !order.points?.discount && order.discountTotal > 0 && <Row label="الخصم" value={`- ${formatMoney(order.discountTotal)}`} />}
      <Divider />
      <Row label={order.paymentStatus === 'PAID' ? 'اتدفع' : 'هيتدفع عند الاستلام'} value={formatMoney(order.grandTotal)} strong />
    </Card>
  );
}

/** True when the customer collects the order from the store. */
export const isPickupOrder = (order: OrderDetail) => order.fulfillment === 'PICKUP';

export function OrderAddress({ order }: { order: OrderDetail }) {
  const a = order.address;
  if (!a || isPickupOrder(order)) {
    const p = order.pickup;
    return (
      <Card style={styles.gapSm}>
        <View style={styles.inline}>
          <Icon as={Store} size={18} color="accent" />
          <Text variant="ui" weight="bold">
            استلام من المتجر
          </Text>
        </View>
        {!!p?.address && (
          <Text variant="meta" color="ink2">
            {p.address}
          </Text>
        )}
        {!!p?.hours && (
          <Text variant="meta" color="ink3">
            المواعيد: {p.hours}
          </Text>
        )}
        {!!p?.mapUrl && <Button label="افتح على الخريطة" icon={MapPin} variant="soft" size="md" onPress={() => Linking.openURL(p.mapUrl).catch(() => undefined)} />}
        {order.customer && (
          <Text variant="meta" color="ink3">
            العميل: {order.customer.name} · {formatPhone(order.customer.phone)}
          </Text>
        )}
        {!!order.notes && (
          <Text variant="meta" color="ink2">
            ملاحظات: {order.notes}
          </Text>
        )}
      </Card>
    );
  }
  return (
    <Card style={styles.gapSm}>
      <View style={styles.inline}>
        <Icon as={MapPin} size={18} color="accent" />
        <Text variant="ui" weight="bold">
          {a.recipientName}
        </Text>
      </View>
      <Text variant="meta" color="ink2">
        {addressLine(a)}
      </Text>
      {!!a.landmark && (
        <Text variant="meta" color="ink3">
          {a.landmark}
        </Text>
      )}
      <Text variant="meta" color="ink3">
        {formatPhone(a.phone)}
      </Text>
      {!!order.notes && (
        <Text variant="meta" color="ink2">
          ملاحظات: {order.notes}
        </Text>
      )}
    </Card>
  );
}

/** Call / WhatsApp buttons for a phone in E.164 (+20…). */
export function ContactButtons({ phone, label }: { phone?: string; label: string }) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return (
    <View style={styles.contact}>
      <Button label={`اتصل بـ${label}`} icon={Phone} variant="secondary" size="md" style={styles.flex} onPress={() => Linking.openURL(`tel:${phone}`).catch(() => undefined)} />
      <Button label="واتساب" icon={MessageCircle} variant="secondary" size="md" style={styles.flex} onPress={() => Linking.openURL(`https://wa.me/${digits}`).catch(() => undefined)} />
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant={strong ? 'bodyStrong' : 'ui'} color={strong ? 'ink' : 'ink2'}>
        {label}
      </Text>
      <Text variant={strong ? 'section' : 'ui'} weight={strong ? undefined : 'semibold'}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 12 },
  gapSm: { gap: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 52, height: 64, borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contact: { flexDirection: 'row', gap: 10 },
});
