import { Image } from 'expo-image';
import { ChevronLeft } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { OrderSummary } from '@/api/types';
import { formatDate, formatMoney, formatPhone } from '@/lib/format';
import { useTheme } from '@/theme';
import { Icon, StatusPill, Tap, Text } from '@/ui';

export const OrderCard = memo(function OrderCard({ order, onPress, seller }: { order: OrderSummary; onPress: () => void; seller?: boolean }) {
  const t = useTheme();
  return (
    <Tap
      onPress={onPress}
      pressScale={0.99}
      style={[styles.card, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.lg }]}
      accessibilityLabel={`طلب رقم ${order.orderNumber}، ${order.statusLabelAr}`}
    >
      <View style={[styles.thumb, { backgroundColor: t.c.sunken }]}>
        {order.previewImageUrl && <Image source={order.previewImageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />}
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text variant="ui" weight="bold" numberOfLines={1} style={styles.flex}>
            {seller ? order.customer?.name ?? 'عميل' : order.brand.name}
          </Text>
          <StatusPill status={order.status} />
        </View>
        <Text variant="meta" color="ink3">
          #{order.orderNumber} · {formatDate(order.createdAt)}
          {seller && order.customer ? ` · ${formatPhone(order.customer.phone)}` : ''}
        </Text>
        <View style={styles.row}>
          <Text variant="ui" color="ink2">
            {order.itemsCount} قطعة · <Text variant="ui" weight="bold">{formatMoney(order.grandTotal)}</Text>
          </Text>
          <Icon as={ChevronLeft} size={18} color="ink3" />
        </View>
      </View>
    </Tap>
  );
});

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, padding: 12, borderWidth: 1 },
  thumb: { width: 68, height: 80, borderRadius: 10, overflow: 'hidden' },
  body: { flex: 1, gap: 4, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  flex: { flex: 1 },
});
