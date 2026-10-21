import { Coins } from 'lucide-react-native';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { flatPages, usePoints, usePointsHistory, type PointsEntry } from '@/api/queries';
import { formatDate, formatMoney } from '@/lib/format';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Card, Divider, ErrorState, Icon, Screen, Skeleton, Text } from '@/ui';

const TYPE_AR: Record<PointsEntry['type'], string> = {
  EARN: 'كسبت من طلب',
  REDEEM: 'استخدمت في طلب',
  REFUND: 'رجعت من طلب اتلغى',
  REVERSAL: 'اتشالت بسبب مرتجع',
  ADJUSTMENT: 'تسوية',
};

/** Fatrina points: earned on every delivered order, spent as a discount at any store. */
export default function Points() {
  const t = useTheme();
  const summary = usePoints();
  const history = usePointsHistory();
  const s = summary.data;
  const rows = flatPages(history.data);

  return (
    <Screen
      header={<AppBar title="نقاطي" />}
      refreshControl={
        <RefreshControl
          refreshing={summary.isRefetching}
          onRefresh={() => {
            void summary.refetch();
            void history.refetch();
          }}
          tintColor={t.c.brand}
          colors={[t.c.brand]}
        />
      }
    >
      {summary.isLoading ? (
        <Skeleton height={140} />
      ) : summary.error || !s ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : (
        <>
          <Card style={styles.hero}>
            <Icon as={Coins} color="accent" size={34} />
            <Text variant="page">{s.balance} نقطة</Text>
            <Text variant="ui" color="ink2">
              تساوي {formatMoney(s.value)} خصم في أي متجر
            </Text>
          </Card>
          <Banner
            icon={Coins}
            title="إزاي النقاط بتشتغل؟"
            body={`كل ${Math.round(1 / s.earnPerEgp)} ج.م في طلب بيتسلّم = نقطة. كل نقطة بـ ${s.pointValue} ج.م. تقدر تستخدمها من ${s.minRedeem} نقطة، ولحد ${Math.round(s.maxRedeemShare * 100)}% من قيمة المنتجات، من صفحة إتمام الطلب.`}
          />
        </>
      )}

      <Text variant="section">السجل</Text>
      {history.isLoading ? (
        <Skeleton height={80} />
      ) : history.error ? (
        <ErrorState error={history.error} onRetry={() => history.refetch()} />
      ) : !rows.length ? (
        <Text variant="ui" color="ink3">
          لسه مفيش حركة. أول طلب يتسلّم هيجيبلك نقاط.
        </Text>
      ) : (
        <Card>
          {rows.map((e, i) => (
            <View key={e._id}>
              {i > 0 && <Divider />}
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text variant="ui">{TYPE_AR[e.type]}</Text>
                  <Text variant="meta" color="ink3">
                    {e.orderNumber ? `#${e.orderNumber} · ` : ''}
                    {formatDate(e.createdAt)}
                  </Text>
                </View>
                <Text variant="ui" weight="bold" color={e.points > 0 ? 'success' : 'ink2'}>
                  {e.points > 0 ? `+${e.points}` : e.points}
                </Text>
              </View>
            </View>
          ))}
          {history.hasNextPage && <Button label="تحميل المزيد" variant="secondary" loading={history.isFetchingNextPage} onPress={() => history.fetchNextPage()} />}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
});
