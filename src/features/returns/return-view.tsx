import { Image } from 'expo-image';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import type { ReturnReason, ReturnRequest, ReturnStatus } from '@/api/types';
import { PhotoStrip } from '@/features/media/photo-row';
import { formatDate, formatMoney, formatRelative } from '@/lib/format';
import { useTheme } from '@/theme';
import { Badge, Card, Icon, Tap, Text } from '@/ui';

export const RETURN_REASON_AR: Record<ReturnReason, string> = {
  WRONG_SIZE: 'المقاس مش مظبوط',
  DAMAGED: 'فيه عيب أو تالف',
  NOT_AS_DESCRIBED: 'مختلف عن الصور',
  WRONG_ITEM: 'وصلني منتج غلط',
  CHANGED_MIND: 'غيرت رأيي',
  OTHER: 'سبب تاني',
};

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
export const RETURN_STATUS: Record<ReturnStatus, { label: string; tone: Tone }> = {
  REQUESTED: { label: 'مستني رد المتجر', tone: 'warning' },
  APPROVED: { label: 'اتوافق عليه', tone: 'brand' },
  REJECTED: { label: 'اترفض', tone: 'danger' },
  RECEIVED: { label: 'المتجر استلم', tone: 'brand' },
  REFUNDED: { label: 'الفلوس رجعت', tone: 'success' },
  CANCELLED: { label: 'اتلغى', tone: 'neutral' },
};

const ACTOR_AR = { CUSTOMER: 'العميل', BRAND: 'المتجر', ADMIN: 'دعم فاترينة' } as const;

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  const s = RETURN_STATUS[status];
  return <Badge label={s.label} tone={s.tone} />;
}

/** One row in a returns list. */
export function ReturnCard({ r, onPress, showCustomer }: { r: ReturnRequest; onPress: () => void; showCustomer?: boolean }) {
  const t = useTheme();
  const count = r.items.reduce((s, i) => s + i.quantity, 0);
  return (
    <Tap onPress={onPress} pressScale={0.99} accessibilityLabel={`مرتجع طلب ${r.orderNumber}`}>
      <Card style={styles.row}>
        <Image source={r.items[0]?.imageUrl} style={[styles.thumb, { backgroundColor: t.c.sunken }]} contentFit="cover" />
        <View style={styles.flex}>
          <Text variant="ui" weight="semibold" numberOfLines={1}>
            {showCustomer ? r.customerName : `طلب #${r.orderNumber}`}
          </Text>
          <Text variant="meta" color="ink3" numberOfLines={1}>
            {count} منتج · {RETURN_REASON_AR[r.reason]} · {formatRelative(r.createdAt)}
          </Text>
          <View style={styles.inline}>
            <ReturnStatusBadge status={r.status} />
            <Text variant="meta" weight="semibold">
              {formatMoney(r.refundAmount)}
            </Text>
          </View>
        </View>
        <Icon as={ChevronLeft} color="ink3" />
      </Card>
    </Tap>
  );
}

/** Items, reason, photos and history of a return (shared by customer and store screens). */
export function ReturnDetails({ r }: { r: ReturnRequest }) {
  const t = useTheme();
  return (
    <>
      <Card style={styles.gap}>
        <View style={styles.between}>
          <Text variant="bodyStrong">طلب #{r.orderNumber}</Text>
          <ReturnStatusBadge status={r.status} />
        </View>
        {r.items.map((i) => (
          <View key={i.variantId} style={styles.itemRow}>
            <Image source={i.imageUrl} style={[styles.thumb, { backgroundColor: t.c.sunken }]} contentFit="cover" />
            <View style={styles.flex}>
              <Text variant="ui" weight="semibold" numberOfLines={2}>
                {i.title}
              </Text>
              <Text variant="meta" color="ink3">
                {[i.size, i.color].filter(Boolean).join(' · ')} {i.quantity > 1 ? `× ${i.quantity}` : ''}
              </Text>
            </View>
            <Text variant="ui">{formatMoney(i.unitPrice * i.quantity)}</Text>
          </View>
        ))}
        <View style={styles.between}>
          <Text variant="ui" color="ink2">
            المبلغ اللي هيرجع
          </Text>
          <Text variant="bodyStrong">{formatMoney(r.refundAmount)}</Text>
        </View>
      </Card>

      <Card style={styles.gap}>
        <Text variant="ui" weight="semibold">
          السبب: {RETURN_REASON_AR[r.reason]}
        </Text>
        {!!r.note && (
          <Text variant="ui" color="ink2">
            {r.note}
          </Text>
        )}
        <PhotoStrip urls={r.images} size={72} />
      </Card>

      <Card style={styles.gap}>
        <Text variant="ui" weight="semibold">
          اللي حصل
        </Text>
        {r.history.map((h, i) => (
          <View key={i} style={styles.event}>
            <View style={[styles.dot, { backgroundColor: i === r.history.length - 1 ? t.c.accent : t.c.lineStrong }]} />
            <View style={styles.flex}>
              <Text variant="ui">
                {RETURN_STATUS[h.status].label} · {ACTOR_AR[h.actor]}
              </Text>
              {!!h.note && (
                <Text variant="meta" color="ink2">
                  {h.note}
                </Text>
              )}
              <Text variant="meta" color="ink3">
                {formatDate(h.at)}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  thumb: { width: 48, height: 58, borderRadius: 8 },
  event: { flexDirection: 'row', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
});
