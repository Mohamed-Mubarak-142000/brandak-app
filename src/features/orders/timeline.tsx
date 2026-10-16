import { Check, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import type { OrderDetail, OrderStatus } from '@/api/types';
import { formatDateTime } from '@/lib/format';
import { useTheme } from '@/theme';
import { ORDER_STATUS_AR, Text } from '@/ui';

const FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const HINT: Partial<Record<OrderStatus, string>> = {
  PENDING: 'البراند هيراجع طلبك ويأكده',
  CONFIRMED: 'البراند أكد الطلب',
  PROCESSING: 'بيتجهز ويتغلّف',
  SHIPPED: 'مع شركة الشحن في الطريق ليك',
  DELIVERED: 'وصل بالسلامة',
};

/** Vertical progress: done steps filled, the current one ringed, future ones muted. */
export function OrderTimeline({ order }: { order: OrderDetail }) {
  const t = useTheme();
  const at = (s: OrderStatus) => order.history.filter((h) => h.status === s).at(-1);
  const cancelled = order.status === 'CANCELLED';
  const reached = cancelled ? FLOW.filter((s) => at(s)) : FLOW.slice(0, FLOW.indexOf(order.status) + 1);
  const steps: OrderStatus[] = cancelled ? [...reached, 'CANCELLED'] : FLOW;

  return (
    <View accessibilityRole="list">
      {steps.map((s, i) => {
        const done = reached.includes(s) || s === 'CANCELLED';
        const current = s === order.status;
        const last = i === steps.length - 1;
        const isCancel = s === 'CANCELLED';
        const entry = at(s);
        const color = isCancel ? t.c.danger : done ? t.c.success : t.c.lineStrong;
        return (
          <View key={s} style={styles.step} accessibilityLabel={`${ORDER_STATUS_AR[s]}${done ? '، تم' : ''}`}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.node,
                  { backgroundColor: done ? color : t.c.surface, borderColor: color },
                  current && !isCancel && { shadowColor: color, shadowOpacity: 0.4, shadowRadius: 6, elevation: 3 },
                ]}
              >
                {done && (isCancel ? <X size={14} color="#fff" strokeWidth={3} /> : <Check size={14} color="#fff" strokeWidth={3} />)}
              </View>
              {!last && <View style={[styles.line, { backgroundColor: reached.includes(steps[i + 1]) || steps[i + 1] === 'CANCELLED' ? color : t.c.line }]} />}
            </View>
            <View style={[styles.copy, !last && styles.copyGap]}>
              <Text variant="ui" weight={current ? 'bold' : 'semibold'} color={done ? 'ink' : 'ink3'}>
                {ORDER_STATUS_AR[s]}
              </Text>
              {entry ? (
                <Text variant="meta" color="ink3">
                  {formatDateTime(entry.at)}
                  {entry.note ? ` · ${entry.note}` : ''}
                </Text>
              ) : (
                !done &&
                HINT[s] && (
                  <Text variant="meta" color="ink3">
                    {HINT[s]}
                  </Text>
                )
              )}
              {isCancel && order.cancelReason && (
                <Text variant="meta" color="danger">
                  السبب: {order.cancelReason}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 24 },
  node: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, minHeight: 28, marginVertical: 2 },
  copy: { flex: 1, paddingTop: 1 },
  copyGap: { paddingBottom: 18 },
});
