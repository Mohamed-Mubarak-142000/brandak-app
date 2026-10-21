import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { BadgeCheck, CircleX, CreditCard, Package, ShoppingBag, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { flatPages, qk, useNotifications } from '@/api/queries';
import type { AppNotification } from '@/api/types';
import { formatRelative } from '@/lib/format';
import { useTheme, type Palette } from '@/theme';
import { AppBar, EmptyState, ErrorState, Icon, Skeleton, Tap, Text } from '@/ui';

const ICON: Record<string, [LucideIcon, keyof Palette]> = {
  ORDER_PLACED: [ShoppingBag, 'accent'],
  ORDER_STATUS_CHANGED: [Package, 'accent'],
  BRAND_APPROVED: [BadgeCheck, 'success'],
  BRAND_REINSTATED: [BadgeCheck, 'success'],
  BRAND_REJECTED: [CircleX, 'danger'],
  BRAND_SUSPENDED: [CircleX, 'danger'],
  PAYMENT_APPROVED: [CreditCard, 'success'],
  PAYMENT_REJECTED: [CreditCard, 'danger'],
  SUBSCRIPTION_EXPIRING: [TriangleAlert, 'warning'],
  SUBSCRIPTION_EXPIRED: [TriangleAlert, 'danger'],
};

export default function Notifications() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const q = useNotifications();
  const items = flatPages(q.data);
  const unread = q.data?.pages[0]?.meta.unread ?? 0;

  const refresh = () => qc.invalidateQueries({ queryKey: qk.notifications });
  const readOne = useMutation({ mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => api.post('/notifications/me/read-all'), onSuccess: refresh });

  const open = (n: AppNotification) => {
    if (!n.readAt) readOne.mutate(n._id);
    const d = n.data ?? {};
    // Brand-side events go to the seller desk; customer order updates to the order page.
    if (n.type === 'ORDER_PLACED' && d.orderId) router.push({ pathname: '/seller/orders/[id]', params: { id: d.orderId } });
    else if (n.type === 'ORDER_STATUS_CHANGED' && d.orderId) router.push({ pathname: '/order/[id]', params: { id: d.orderId } });
    else if (n.type.startsWith('SETTLEMENT') || n.type.startsWith('PAYMENT') || n.type.startsWith('SUBSCRIPTION')) router.push('/seller/balance');
    else if (n.type.startsWith('BRAND')) router.push('/seller');
  };

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <AppBar
        title="الإشعارات"
        end={
          unread > 0 ? (
            <Tap onPress={() => readAll.mutate()} hitSlop={10} pressScale={1} style={styles.readAll}>
              <Text variant="ui" color="accent">
                قراءة الكل
              </Text>
            </Tap>
          ) : undefined
        }
      />
      <FlatList
        data={items}
        keyExtractor={(n) => n._id}
        renderItem={({ item: n }) => {
          const [glyph, color] = ICON[n.type] ?? [Package, 'ink2'];
          return (
            <Tap
              onPress={() => open(n)}
              pressScale={1}
              style={[styles.row, { backgroundColor: n.readAt ? 'transparent' : t.c.accentSoft, borderBottomColor: t.c.line }]}
              accessibilityLabel={`${n.readAt ? '' : 'جديد، '}${n.title}`}
            >
              <View style={[styles.icon, { backgroundColor: t.c.surface }]}>
                <Icon as={glyph} color={color} size={20} />
              </View>
              <View style={styles.flex}>
                <Text variant="ui" weight={n.readAt ? 'medium' : 'bold'}>
                  {n.title}
                </Text>
                <Text variant="meta" color="ink2">
                  {n.body}
                </Text>
                <Text variant="meta" color="ink3">
                  {formatRelative(n.createdAt)}
                </Text>
              </View>
              {!n.readAt && <View style={[styles.dot, { backgroundColor: t.c.brand }]} />}
            </Tap>
          );
        }}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
        ListEmptyComponent={
          q.isLoading ? (
            <View style={styles.pad}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={72} style={{ marginBottom: 10 }} />
              ))}
            </View>
          ) : q.error ? (
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          ) : (
            <EmptyState art="bell" title="مفيش إشعارات" body="هنبلغك هنا بكل جديد في طلباتك." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16 },
  readAll: { paddingHorizontal: 8, height: 44, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
});
