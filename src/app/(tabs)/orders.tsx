import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flatPages, useOrders } from '@/api/queries';
import type { OrderStatus } from '@/api/types';
import { useSession } from '@/auth/session';
import { useAuthPrompt } from '@/auth/use-auth';
import { OrderCard } from '@/features/orders/order-card';
import { useTheme } from '@/theme';
import { Chip, EmptyState, ErrorState, Skeleton, Text } from '@/ui';

const FILTERS: { key: string; label: string; status?: OrderStatus }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'PENDING', label: 'في الانتظار', status: 'PENDING' },
  { key: 'SHIPPED', label: 'في الطريق', status: 'SHIPPED' },
  { key: 'DELIVERED', label: 'تم التوصيل', status: 'DELIVERED' },
  { key: 'CANCELLED', label: 'ملغية', status: 'CANCELLED' },
];

export default function OrdersTab() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authed = useSession((s) => s.status === 'authed');
  const showAuth = useAuthPrompt((s) => s.show);
  const [filter, setFilter] = useState(FILTERS[0]);
  const q = useOrders(filter.status);
  const items = flatPages(q.data);

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: insets.top + 6 }]}>
      <View style={styles.head}>
        <Text variant="page" accessibilityRole="header">
          طلباتي
        </Text>
      </View>
      {!authed ? (
        <EmptyState art="box" title="تابع طلباتك من هنا" body="سجّل دخول وشوف كل طلباتك وحالتها لحظة بلحظة." action="تسجيل الدخول" onAction={() => showAuth('')} />
      ) : (
        <>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {FILTERS.map((f) => (
                <Chip key={f.key} label={f.label} selected={filter.key === f.key} onPress={() => setFilter(f)} />
              ))}
            </ScrollView>
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
                  title={filter.status ? 'مفيش طلبات هنا' : 'لسه معملتش طلبات'}
                  body={filter.status ? 'جرّب فلتر تاني.' : 'أول طلب ليك هيظهر هنا وتقدر تتابعه خطوة بخطوة.'}
                  action={filter.status ? undefined : 'ابدأ التسوق'}
                  onAction={() => router.push('/explore')}
                />
              )
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { paddingHorizontal: 16, paddingBottom: 8 },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 },
  item: { marginBottom: 12 },
  gap: { gap: 12 },
});
