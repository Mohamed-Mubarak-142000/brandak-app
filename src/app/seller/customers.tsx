import { FlatList, Linking, StyleSheet, View } from 'react-native';
import { Phone } from 'lucide-react-native';

import { flatPages, useCustomers } from '@/api/queries';
import { formatMoney, formatPhone, formatRelative } from '@/lib/format';
import { useTheme } from '@/theme';
import { AppBar, EmptyState, ErrorState, IconButton, Skeleton, Text } from '@/ui';

export default function Customers() {
  const t = useTheme();
  const q = useCustomers();
  const items = flatPages(q.data);
  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <AppBar title="العملاء" />
      <FlatList
        data={items}
        keyExtractor={(c) => c.customerId}
        contentContainerStyle={styles.list}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        renderItem={({ item: c }) => (
          <View style={[styles.row, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.md }]}>
            <View style={[styles.avatar, { backgroundColor: t.c.accentSoft }]}>
              <Text variant="ui" weight="bold" color="accent">
                {c.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text variant="ui" weight="semibold">
                {c.name}
              </Text>
              <Text variant="meta" color="ink3">
                {formatPhone(c.phone)} · آخر طلب {formatRelative(c.lastOrderAt)}
              </Text>
              <Text variant="meta" color="ink2">
                {c.ordersCount} طلب · {c.deliveredCount} اتسلّم · {formatMoney(c.totalSpent)}
              </Text>
            </View>
            <IconButton icon={Phone} label={`اتصال بـ ${c.name}`} background="sunken" onPress={() => Linking.openURL(`tel:${c.phone}`).catch(() => undefined)} />
          </View>
        )}
        ListEmptyComponent={
          q.isLoading ? (
            <View style={styles.gap}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={76} />
              ))}
            </View>
          ) : q.error ? (
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          ) : (
            <EmptyState art="empty" title="لسه مفيش عملاء" body="أول ما حد يطلب من متجرك هيظهر هنا." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16 },
  gap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
