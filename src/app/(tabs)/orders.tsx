import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flatPages, useOrders } from '@/api/queries';
import type { OrderStatus } from '@/api/types';
import { useSession } from '@/auth/session';
import { useAuthPrompt } from '@/auth/use-auth';
import { OrderCard } from '@/features/orders/order-card';
import { useTheme } from '@/theme';
import { ActiveChips, FilterButton } from '@/features/catalog/filters';
import { Button, EmptyState, ErrorState, ORDER_STATUS_AR, Select, Sheet, Skeleton, Text } from '@/ui';

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function OrdersTab() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authed = useSession((s) => s.status === 'authed');
  const showAuth = useAuthPrompt((s) => s.show);
  const [status, setStatus] = useState<OrderStatus | undefined>();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<OrderStatus | 'ALL'>('ALL');
  const q = useOrders(status);
  const items = flatPages(q.data);

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: insets.top + 6 }]}>
      <View style={styles.head}>
        <Text variant="page" accessibilityRole="header" style={styles.flex}>
          طلباتي
        </Text>
        {authed && (
          <FilterButton
            count={status ? 1 : 0}
            label="فلترة الطلبات"
            onPress={() => {
              setDraft(status ?? 'ALL');
              setOpen(true);
            }}
          />
        )}
      </View>
      {!authed ? (
        <EmptyState art="box" title="تابع طلباتك من هنا" body="سجّل دخول وشوف كل طلباتك وحالتها لحظة بلحظة." action="تسجيل الدخول" onAction={() => showAuth('')} />
      ) : (
        <>
          <View style={styles.chips}>
            <ActiveChips chips={status ? [{ key: 'status', label: ORDER_STATUS_AR[status], onRemove: () => setStatus(undefined) }] : []} />
          </View>
          <FlatList
            data={items}
            keyExtractor={(o) => o.id}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <OrderCard order={item} onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })} />
              </View>
            )}
            contentContainerStyle={styles.list}
            onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
            refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
            ListEmptyComponent={
              q.isLoading ? (
                <View style={styles.gap}>
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} height={104} radius={16} />
                  ))}
                </View>
              ) : q.error ? (
                <ErrorState error={q.error} onRetry={() => q.refetch()} />
              ) : (
                <EmptyState
                  art="box"
                  title={status ? 'مفيش طلبات بالحالة دي' : 'لسه معملتش طلبات'}
                  body={status ? 'جرّب فلتر تاني.' : 'أول طلب ليك هيظهر هنا وتقدر تتابعه خطوة بخطوة.'}
                  action={status ? undefined : 'ابدأ التسوق'}
                  onAction={() => router.push('/explore')}
                />
              )
            }
          />
        </>
      )}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="فلترة الطلبات"
        footer={
          <View style={styles.footer}>
            <Button
              label="عرض الطلبات"
              style={styles.flex}
              onPress={() => {
                setStatus(draft === 'ALL' ? undefined : draft);
                setOpen(false);
              }}
            />
            <Button label="مسح" variant="secondary" block={false} onPress={() => setDraft('ALL')} />
          </View>
        }
      >
        <Select<OrderStatus | 'ALL'>
          label="حالة الطلب"
          sheetTitle="اختار الحالة"
          value={draft}
          onChange={setDraft}
          options={[{ value: 'ALL', label: 'كل الطلبات' }, ...STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_AR[s] }))]}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  chips: { paddingHorizontal: 16 },
  footer: { flexDirection: 'row', gap: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 },
  item: { marginBottom: 12 },
  gap: { gap: 12 },
});
