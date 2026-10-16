import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { flatPages, useSellerOrders } from '@/api/queries';
import type { OrderStatus } from '@/api/types';
import { OrderCard } from '@/features/orders/order-card';
import { DeskHeader } from '@/features/seller/desk-header';
import { useTheme } from '@/theme';
import { Chip, EmptyState, ErrorState, ORDER_STATUS_AR, Skeleton, TextField } from '@/ui';

const STATUSES: (OrderStatus | undefined)[] = [undefined, 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function SellerOrders() {
  const t = useTheme();
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus | undefined>('PENDING');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);
  const orders = useSellerOrders({ status, q: q || undefined });
  const items = flatPages(orders.data);

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <DeskHeader title="الطلبات" subtitle={orders.data ? `${orders.data.pages[0]?.meta.total ?? 0} طلب` : undefined} />
      <View style={styles.search}>
        <TextField label="بحث" icon={Search} value={text} onChangeText={setText} placeholder="رقم الطلب أو موبايل العميل" returnKeyType="search" />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUSES.map((s) => (
            <Chip key={s ?? 'all'} label={s ? ORDER_STATUS_AR[s] : 'الكل'} selected={status === s} onPress={() => setStatus(s)} />
          ))}
        </ScrollView>
      </View>
      <FlashList
        data={items}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <OrderCard seller order={item} onPress={() => router.push({ pathname: '/seller/orders/[id]', params: { id: item.id } })} />
          </View>
        )}
        contentContainerStyle={styles.list}
        onEndReached={() => orders.hasNextPage && !orders.isFetchingNextPage && orders.fetchNextPage()}
        refreshControl={<RefreshControl refreshing={orders.isRefetching && !orders.isFetchingNextPage} onRefresh={() => void orders.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
        ListEmptyComponent={
          orders.isLoading ? (
            <View style={styles.gap}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={104} radius={16} />
              ))}
            </View>
          ) : orders.error ? (
            <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
          ) : (
            <EmptyState art="box" title={status === 'PENDING' ? 'مفيش طلبات مستنية تأكيد' : 'مفيش طلبات هنا'} body="الطلبات الجديدة هتظهر هنا وهيوصلك إشعار بيها." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { paddingHorizontal: 16, paddingBottom: 8 },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  item: { marginBottom: 12 },
  gap: { gap: 12 },
});
