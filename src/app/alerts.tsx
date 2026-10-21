import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BellRing, TrendingDown, X } from 'lucide-react-native';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { type MyAlert, useMyAlerts } from '@/api/queries';
import { formatMoney } from '@/lib/format';
import { useTheme } from '@/theme';
import { AppBar, Badge, Card, EmptyState, ErrorState, Icon, IconButton, Screen, Skeleton, Tap, Text, toast } from '@/ui';

/** Price-drop and back-in-stock alerts the customer asked for. */
export default function Alerts() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const q = useMyAlerts();

  const remove = useMutation({
    mutationFn: (a: MyAlert) => api.post(`/products/${a.productId}/alerts/remove`, { type: a.type, variantId: a.variantId ?? undefined }),
    onSuccess: (_d, a) => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alerts', a.productId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Screen
      header={<AppBar title="تنبيهاتي" />}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
    >
      {q.isLoading ? (
        <Skeleton height={90} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState
          art="empty"
          title="مفيش تنبيهات"
          body="من صفحة أي منتج دوس «بلغني لو السعر نزل»، أو «بلغني لما يرجع» لو المقاس خلص، وهنبعتلك إشعار وإيميل."
          action="اكتشف المنتجات"
          onAction={() => router.push('/explore')}
        />
      ) : (
        q.data.map((a) => (
          <Tap key={`${a.productId}-${a.type}-${a.variantId}`} onPress={() => router.push({ pathname: '/product/[id]', params: { id: a.productId } })} pressScale={0.99}>
            <Card style={styles.row}>
              <Image source={a.imageUrl} style={[styles.thumb, { backgroundColor: t.c.sunken }]} contentFit="cover" />
              <View style={styles.flex}>
                <Text variant="ui" weight="semibold" numberOfLines={2}>
                  {a.title}
                </Text>
                <View style={styles.inline}>
                  <Icon as={a.type === 'PRICE_DROP' ? TrendingDown : BellRing} size={14} color="accent" />
                  <Text variant="meta" color="ink2">
                    {a.type === 'PRICE_DROP'
                      ? `لو نزل عن ${formatMoney(a.watchedPrice ?? a.price)}`
                      : `لما يرجع${a.variantLabel ? ` (${a.variantLabel})` : ''}`}
                  </Text>
                </View>
                {!a.available ? <Badge label="مبقاش متاح" tone="neutral" /> : a.type === 'BACK_IN_STOCK' && a.inStock ? <Badge label="رجع متوفر" tone="success" /> : null}
              </View>
              <IconButton icon={X} label="إلغاء التنبيه" size={36} onPress={() => remove.mutate(a)} />
            </Card>
          </Tap>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  thumb: { width: 52, height: 64, borderRadius: 8 },
});
