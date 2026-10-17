import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { CreditCard, PackageX, Plus, TrendingDown, TrendingUp, Users } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useMyBrand, useMySubscriptions, useOverview } from '@/api/queries';
import { DeskHeader } from '@/features/seller/desk-header';
import { SalesChart } from '@/features/seller/sales-chart';
import { formatDate, formatMoney } from '@/lib/format';
import { useTheme } from '@/theme';
import { Banner, Button, Card, Chip, ErrorState, Icon, IconButton, SectionHeader, Skeleton, Tap, Text } from '@/ui';

const RANGES = [7, 30, 90];

export default function Overview() {
  const t = useTheme();
  const router = useRouter();
  const brand = useMyBrand();
  const subs = useMySubscriptions();
  const [days, setDays] = useState(30);
  const q = useOverview(days);
  const o = q.data;

  const [now] = useState(() => Date.now());
  const daysLeft = brand.data?.subscriptionEndsAt ? Math.ceil((new Date(brand.data.subscriptionEndsAt).getTime() - now) / 86_400_000) : null;
  const needsPlan = subs.isSuccess && !subs.data.current;
  const pendingPay = subs.data?.pending?.payment;

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <DeskHeader
        title={brand.data?.name ?? 'متجري'}
        subtitle="لوحة التحكم"
        end={<IconButton icon={Users} label="العملاء" background="surface" onPress={() => router.push('/seller/customers')} />}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching}
            onRefresh={() => {
              q.refetch();
              subs.refetch();
            }}
            tintColor={t.c.brand}
            colors={[t.c.brand]}
          />
        }
      >
        {/* Subscription state comes first: nothing sells without it. */}
        {pendingPay?.status === 'PENDING_REVIEW' ? (
          <Banner icon={CreditCard} title="الدفع تحت المراجعة" body="هنفعّل اشتراكك أول ما نتأكد من التحويل." action="التفاصيل" onAction={() => router.push('/seller/plans')} />
        ) : pendingPay?.status === 'AWAITING_PROOF' || pendingPay?.status === 'REJECTED' ? (
          <Banner
            icon={CreditCard}
            tone={pendingPay.status === 'REJECTED' ? 'danger' : 'warning'}
            title={pendingPay.status === 'REJECTED' ? 'إثبات الدفع اترفض' : 'كمّل الدفع عشان تبدأ تبيع'}
            body={pendingPay.rejectionReason ?? 'ارفع صورة تحويل InstaPay'}
            action="ادفع"
            onAction={() => router.push({ pathname: '/seller/pay/[subscriptionId]', params: { subscriptionId: subs.data!.pending!._id } })}
          />
        ) : needsPlan ? (
          <Banner icon={CreditCard} tone="warning" title="محتاج اشتراك عشان منتجاتك تظهر" body="اختار باقة وادفع بـ InstaPay في دقيقة." action="الباقات" onAction={() => router.push('/seller/plans')} />
        ) : daysLeft != null && daysLeft <= 7 ? (
          <Banner icon={CreditCard} tone="warning" title={`الاشتراك بيخلص خلال ${Math.max(0, daysLeft)} يوم`} body={`ينتهي ${formatDate(brand.data!.subscriptionEndsAt)}`} action="جدّد" onAction={() => router.push('/seller/plans')} />
        ) : null}

        <View style={styles.ranges}>
          {RANGES.map((d) => (
            <Chip key={d} label={`آخر ${d} يوم`} selected={days === d} onPress={() => setDays(d)} />
          ))}
        </View>

        {q.isLoading ? (
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={92} radius={16} style={styles.kpi} />
            ))}
          </View>
        ) : q.error || !o ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <>
            <View style={styles.grid}>
              <Kpi label="المبيعات" value={formatMoney(o.salesValue)} change={o.salesChangePct} />
              <Kpi label="الطلبات" value={String(o.orders.count)} change={o.orders.changePct} />
              <Kpi label="متوسط الطلب" value={formatMoney(o.averageOrderValue)} />
              <Kpi label="محتاجة تأكيد" value={String(o.orders.pendingNow)} highlight={o.orders.pendingNow > 0} onPress={() => router.push('/seller/orders')} />
            </View>

            <Card>
              <SectionHeader title="المبيعات اليومية" />
              <View style={{ height: 12 }} />
              {o.daily.some((d) => d.sales > 0) ? (
                <SalesChart daily={o.daily} />
              ) : (
                <Text variant="ui" color="ink3">
                  مفيش مبيعات في الفترة دي لسه.
                </Text>
              )}
            </Card>

            {o.plan && (
              <Card style={styles.gapSm}>
                <View style={styles.between}>
                  <Text variant="bodyStrong">باقة {o.plan.name}</Text>
                  <Text variant="meta" color="ink3">
                    لحد {formatDate(o.plan.endsAt)}
                  </Text>
                </View>
                <Text variant="meta" color="ink2">
                  {o.plan.activeProducts} من {o.plan.maxActiveProducts} منتج منشور
                </Text>
                <View style={[styles.track, { backgroundColor: t.c.line }]}>
                  <View style={[styles.fill, { width: `${Math.min(100, (o.plan.activeProducts / Math.max(1, o.plan.maxActiveProducts)) * 100)}%`, backgroundColor: t.c.brand }]} />
                </View>
              </Card>
            )}

            {o.topProducts.length > 0 && (
              <Card style={styles.gap}>
                <SectionHeader title="الأكثر مبيعاً" />
                {o.topProducts.map((p, i) => (
                  <View key={p.productId} style={styles.row}>
                    <Text variant="ui" color="ink3" style={styles.rank}>
                      {i + 1}
                    </Text>
                    <Image source={p.imageUrl} style={[styles.thumb, { backgroundColor: t.c.sunken }]} contentFit="cover" />
                    <Text variant="ui" numberOfLines={1} style={styles.flex}>
                      {p.title}
                    </Text>
                    <View style={styles.end}>
                      <Text variant="ui" weight="bold">
                        {p.quantity} قطعة
                      </Text>
                      <Text variant="meta" color="ink3">
                        {formatMoney(p.revenue)}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {o.lowStock.length > 0 && (
              <Card style={styles.gap}>
                <View style={styles.inline}>
                  <Icon as={PackageX} color="warning" />
                  <Text variant="section">مخزون قليل</Text>
                </View>
                {o.lowStock.map((p) => (
                  <View key={p.productId} style={styles.row}>
                    <Image source={p.imageUrl} style={[styles.thumb, { backgroundColor: t.c.sunken }]} contentFit="cover" />
                    <View style={styles.flex}>
                      <Text variant="ui" numberOfLines={1}>
                        {p.title}
                      </Text>
                      <Text variant="meta" color="warning">
                        {p.variants.map((v) => `${[v.size, v.color].filter(Boolean).join('/') || 'أساسي'}: ${v.stock}`).join(' · ')}
                      </Text>
                    </View>
                    <Button label="تعديل" size="sm" variant="soft" block={false} onPress={() => router.push({ pathname: '/seller/products/edit', params: { id: p.productId } })} />
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
        <Button label="إضافة منتج جديد" icon={Plus} variant="secondary" onPress={() => router.push('/seller/products/edit')} />
      </ScrollView>
    </View>
  );
}

function Kpi({ label, value, change, highlight, onPress }: { label: string; value: string; change?: number | null; highlight?: boolean; onPress?: () => void }) {
  const t = useTheme();
  const up = (change ?? 0) >= 0;
  return (
    <Tap
      onPress={onPress}
      disabled={!onPress}
      pressScale={onPress ? 0.98 : 1}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={[styles.kpi, { backgroundColor: highlight ? t.c.accentSoft : t.c.surface, borderColor: highlight ? t.c.brand : t.c.line, borderRadius: t.radius.lg }]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text variant="meta" color="ink3">
        {label}
      </Text>
      <Text variant="section" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {change != null && (
        <View style={styles.inline}>
          <Icon as={up ? TrendingUp : TrendingDown} size={14} color={up ? 'success' : 'danger'} />
          <Text variant="meta" color={up ? 'success' : 'danger'}>
            {up ? '+' : ''}
            {Math.round(change)}% عن الفترة اللي قبلها
          </Text>
        </View>
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  ranges: { flexDirection: 'row', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { flexBasis: '47%', flexGrow: 1, padding: 14, gap: 4, borderWidth: 1 },
  gap: { gap: 12 },
  gapSm: { gap: 6 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 16, textAlign: 'center' },
  thumb: { width: 40, height: 48, borderRadius: 6 },
  end: { alignItems: 'flex-end' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
