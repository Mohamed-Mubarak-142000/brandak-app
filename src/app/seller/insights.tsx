import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Search, SearchX, TrendingUp } from 'lucide-react-native';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { formatMoney } from '@/lib/format';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Card, Divider, ErrorState, Icon, Screen, Skeleton, Text } from '@/ui';

interface SearchInsights {
  days: number;
  yours: { term: string; searches: number }[];
  missing: { term: string; searches: number; results: number }[];
}
interface WeekSummary {
  orders: number;
  deliveredOrders: number;
  deliveredSales: number;
  cancelled: number;
  topProducts: { title: string; quantity: number }[];
  commissionBalance: number;
}

/** What people search for: what brought them to the store, and what nobody sells yet. */
export default function Insights() {
  const t = useTheme();
  const router = useRouter();
  const searches = useQuery({ queryKey: ['seller', 'insights', 'searches'], queryFn: () => api.get<SearchInsights>('/brand/insights/searches') });
  const week = useQuery({ queryKey: ['seller', 'insights', 'week'], queryFn: () => api.get<WeekSummary>('/brand/insights/week') });
  const s = searches.data;
  const w = week.data;

  return (
    <Screen
      header={<AppBar title="الناس بتدوّر على إيه" />}
      refreshControl={
        <RefreshControl
          refreshing={searches.isRefetching}
          onRefresh={() => {
            void searches.refetch();
            void week.refetch();
          }}
          tintColor={t.c.brand}
          colors={[t.c.brand]}
        />
      }
    >
      {w && (
        <Card style={styles.gap}>
          <Text variant="bodyStrong">آخر 7 أيام</Text>
          <View style={styles.stats}>
            <Stat label="طلبات" value={String(w.orders)} />
            <Stat label="اتسلم" value={String(w.deliveredOrders)} />
            <Stat label="مبيعات" value={formatMoney(w.deliveredSales)} />
          </View>
          {!!w.topProducts.length && (
            <Text variant="meta" color="ink2">
              الأكتر طلباً: {w.topProducts.map((p) => `${p.title} (${p.quantity})`).join('، ')}
            </Text>
          )}
          <Text variant="meta" color="ink3">
            التقرير ده بيوصلك كمان على الإيميل كل يوم حد.
          </Text>
        </Card>
      )}

      {searches.isLoading ? (
        <Skeleton height={160} />
      ) : searches.error || !s ? (
        <ErrorState error={searches.error} onRetry={() => searches.refetch()} />
      ) : (
        <>
          <Section icon={TrendingUp} title="الناس لقيتك وهي بتدوّر على" empty="لسه محدش لقى منتجاتك من البحث. كلمات مفتاحية أوضح في منتجاتك بتفرق." rows={s.yours.map((r) => ({ term: r.term, n: r.searches }))} />
          <Section
            icon={SearchX}
            title="بيدوّروا عليه ومش لاقيينه"
            empty="مفيش طلبات ناقصة دلوقتي."
            rows={s.missing.map((r) => ({ term: r.term, n: r.searches }))}
          />
          {!!s.missing.length && (
            <Banner icon={Search} title="فرصة" body="لو عندك أي حاجة من دي، ضيفها واكتب الكلمة في اسمها أو كلماتها المفتاحية، وهتظهر لأول الناس اللي بتدوّر." />
          )}
          <Button label="ضيف منتج" variant="secondary" onPress={() => router.push('/seller/products/edit')} />
        </>
      )}
    </Screen>
  );
}

function Section({ icon, title, rows, empty }: { icon: typeof Search; title: string; rows: { term: string; n: number }[]; empty: string }) {
  return (
    <Card style={styles.gap}>
      <View style={styles.row}>
        <Icon as={icon} color="accent" />
        <Text variant="bodyStrong">{title}</Text>
      </View>
      {!rows.length ? (
        <Text variant="ui" color="ink3">
          {empty}
        </Text>
      ) : (
        rows.map((r, i) => (
          <View key={r.term}>
            {i > 0 && <Divider />}
            <View style={styles.between}>
              <Text variant="ui">{r.term}</Text>
              <Text variant="meta" color="ink3">
                {r.n} بحث
              </Text>
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="meta" color="ink3">
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 2 },
});
