import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, CircleAlert, Trash2, Truck } from 'lucide-react-native';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { useBrand, useCart, useCartMutations, useCarts } from '@/api/queries';
import type { CartSummary, LineIssue, PricedLine } from '@/api/types';
import { useAuthPrompt } from '@/auth/use-auth';
import { useSession } from '@/auth/session';
import { BrandLogo } from '@/features/catalog/brand-card';
import { formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Banner, Button, Card, Divider, EmptyState, ErrorState, Icon, IconButton, QuantityStepper, Skeleton, Tap, Text, toast } from '@/ui';

const ISSUE: Record<LineIssue, string> = {
  UNAVAILABLE: 'المنتج ده مبقاش متاح — احذفه عشان تكمل',
  OUT_OF_STOCK: 'نفدت الكمية — احذفه عشان تكمل',
  INSUFFICIENT_STOCK: 'الكمية المتاحة أقل من المطلوب',
};

export default function CartTab() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authed = useSession((s) => s.status === 'authed');
  const showAuth = useAuthPrompt((s) => s.show);
  const carts = useCarts();

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Text variant="page" accessibilityRole="header">
        السلة
      </Text>
      {!!carts.data?.length && (
        <Text variant="ui" color="ink3">
          {carts.data.length > 1 ? `${carts.data.length} متاجر · كل متجر طلب منفصل` : 'طلب واحد'}
        </Text>
      )}
    </View>
  );

  if (!authed)
    return (
      <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
        {header}
        <EmptyState art="bag" title="سلتك مستنياك" body="سجّل دخول عشان تضيف منتجات وتطلب من المتاجر اللي بتحبها." action="تسجيل الدخول" onAction={() => showAuth('')} />
      </View>
    );

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      {header}
      {carts.isLoading ? (
        <View style={styles.pad}>
          <Skeleton height={220} radius={16} />
        </View>
      ) : carts.error ? (
        <ErrorState error={carts.error} onRetry={() => carts.refetch()} />
      ) : !carts.data?.length ? (
        <EmptyState art="bag" title="سلتك فاضية" body="اكتشف المعارض والمحلات والمخازن والبراندات، وضيف اللي يعجبك." action="ابدأ التسوق" onAction={() => router.push('/explore')} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={carts.isRefetching} onRefresh={() => void carts.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
        >
          {carts.data.map((c) => (
            <BrandCart key={c.brand.id} summary={c} />
          ))}
          <Banner icon={Truck} title="الدفع كاش عند الاستلام" body="كل متجر بيشحن طلبه لوحده، فممكن يوصلوا في أيام مختلفة." />
        </ScrollView>
      )}
    </View>
  );
}

function BrandCart({ summary }: { summary: CartSummary }) {
  const t = useTheme();
  const router = useRouter();
  const brandId = summary.brand.id;
  const cart = useCart(brandId);
  const brand = useBrand(summary.brand.slug);
  const m = useCartMutations(brandId);
  const data = cart.data;
  const s = brand.data?.shipping;
  const subtotal = data?.subtotal ?? 0;
  const free = s?.freeShippingThreshold ?? null;
  const toFree = free != null ? Math.max(0, free - subtotal) : null;
  const belowMin = s ? subtotal < s.minOrderAmount : false;

  const onErr = (e: unknown) => toast.error(errorMessage(e));

  return (
    <Animated.View layout={LinearTransition.duration(220)} entering={FadeIn.duration(200)}>
      <Card padded={false} style={styles.card}>
        <Tap
          style={styles.brandHead}
          pressScale={1}
          onPress={() => router.push({ pathname: '/brand/[slug]', params: { slug: summary.brand.slug } })}
          accessibilityLabel={`متجر ${summary.brand.name}`}
        >
          <BrandLogo uri={summary.brand.logoUrl} size={36} name={summary.brand.name} />
          <Text variant="bodyStrong" style={styles.flex}>
            {summary.brand.name}
          </Text>
          <Text variant="meta" color="ink3">
            {summary.itemsCount} قطعة
          </Text>
        </Tap>
        <Divider />

        {cart.isLoading ? (
          <View style={styles.inner}>
            <Skeleton height={84} />
          </View>
        ) : cart.error ? (
          <View style={styles.inner}>
            <Banner icon={CircleAlert} tone="danger" title={errorMessage(cart.error)} action="إعادة" onAction={() => cart.refetch()} />
          </View>
        ) : (
          data?.items.map((line, i) => (
            <View key={line.itemId}>
              {i > 0 && <Divider inset={16} />}
              <CartLine
                line={line}
                busy={m.setQty.isPending || m.remove.isPending}
                onQty={(q) => m.setQty.mutate({ itemId: line.itemId, quantity: q }, { onError: onErr })}
                onRemove={() => {
                  haptic.light();
                  m.remove.mutate(line.itemId, { onError: onErr, onSuccess: () => toast.info('اتشال من السلة') });
                }}
              />
            </View>
          ))
        )}

        {data && (
          <View style={[styles.inner, styles.summary, { backgroundColor: t.c.sunken }]}>
            {toFree != null && <FreeShippingBar remaining={toFree} threshold={free!} />}
            {!data.acceptingOrders && <Banner icon={CircleAlert} tone="warning" title="المتجر مش بيستقبل طلبات دلوقتي" />}
            {belowMin && s && <Banner icon={CircleAlert} tone="warning" title={`أقل طلب للمتجر ده ${formatMoney(s.minOrderAmount)}`} body={`ضيف بـ ${formatMoney(s.minOrderAmount - subtotal)} كمان`} />}
            {data.hasIssues && <Banner icon={CircleAlert} tone="danger" title="فيه منتجات محتاجة مراجعة قبل الطلب" />}
            <View style={styles.totalRow}>
              <Text variant="ui" color="ink2">
                المجموع الفرعي
              </Text>
              <Text variant="bodyStrong">{formatMoney(subtotal)}</Text>
            </View>
            <Button
              label={`إتمام طلب ${summary.brand.name}`}
              iconEnd={ArrowLeft}
              disabled={data.hasIssues || !data.acceptingOrders || belowMin || !data.items.length}
              onPress={() => router.push({ pathname: '/checkout/[brandId]', params: { brandId } })}
            />
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

function CartLine({ line, busy, onQty, onRemove }: { line: PricedLine; busy: boolean; onQty: (q: number) => void; onRemove: () => void }) {
  const t = useTheme();
  const router = useRouter();
  const opts = [line.size, line.color].filter(Boolean).join(' · ');
  return (
    <View style={[styles.line, line.issue && { opacity: 0.85 }]}>
      <Tap onPress={() => router.push({ pathname: '/product/[id]', params: { id: line.productId } })} pressScale={0.97} accessibilityLabel={line.title}>
        <Image source={line.imageUrl} style={[styles.thumb, { backgroundColor: t.c.sunken }]} contentFit="cover" transition={150} />
      </Tap>
      <View style={[styles.flex, styles.lineBody]}>
        <View style={styles.lineTop}>
          <Text variant="ui" numberOfLines={2} style={styles.flex}>
            {line.title}
          </Text>
          <IconButton icon={Trash2} label={`حذف ${line.title}`} size={36} color="ink3" onPress={onRemove} />
        </View>
        {!!opts && (
          <Text variant="meta" color="ink3">
            {opts}
          </Text>
        )}
        {line.issue && (
          <Text variant="meta" color="danger">
            {ISSUE[line.issue]}
            {line.issue === 'INSUFFICIENT_STOCK' ? ` (المتاح ${line.available})` : ''}
          </Text>
        )}
        <View style={styles.lineBottom}>
          <Text variant="bodyStrong">{formatMoney(line.lineTotal)}</Text>
          {line.issue !== 'UNAVAILABLE' && line.issue !== 'OUT_OF_STOCK' && (
            <QuantityStepper compact value={line.quantity} onChange={onQty} max={Math.max(1, Math.min(line.available, 20))} onRemove={onRemove} disabled={busy} />
          )}
        </View>
      </View>
    </View>
  );
}

function FreeShippingBar({ remaining, threshold }: { remaining: number; threshold: number }) {
  const t = useTheme();
  const pct = Math.min(1, (threshold - remaining) / threshold);
  const bar = useAnimatedStyle(() => ({ width: withTiming(`${pct * 100}%`, { duration: 300 }) }));
  return (
    <View style={styles.freeWrap} accessibilityLabel={remaining > 0 ? `باقي ${formatMoney(remaining)} للشحن المجاني` : 'الشحن مجاني'}>
      <View style={styles.inline}>
        <Icon as={Truck} size={18} color={remaining > 0 ? 'accent' : 'success'} />
        <Text variant="ui" color={remaining > 0 ? 'ink' : 'success'} weight="semibold">
          {remaining > 0 ? `ضيف بـ ${formatMoney(remaining)} وخد الشحن مجاناً` : 'مبروك! الشحن عليك مجاناً'}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: t.c.line }]}>
        <Animated.View style={[styles.fill, { backgroundColor: remaining > 0 ? t.c.brand : t.c.success }, bar]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 2 },
  pad: { padding: 16 },
  list: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { overflow: 'hidden' },
  brandHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  inner: { padding: 16 },
  line: { flexDirection: 'row', gap: 12, padding: 14 },
  thumb: { width: 84, height: 104, borderRadius: 10 },
  lineBody: { gap: 4 },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  lineBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 6 },
  summary: { gap: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  freeWrap: { gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
