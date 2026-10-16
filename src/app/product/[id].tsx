import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, BadgeCheck, ChevronLeft, Flag, Share2, ShoppingBag, Truck, Undo2, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { flatPages, useBrand, useCartMutations, useProduct, useReviews } from '@/api/queries';
import { useRequireAuth } from '@/auth/use-auth';
import { BrandLogo } from '@/features/catalog/brand-card';
import { Gallery } from '@/features/catalog/gallery';
import { WishlistHeart } from '@/features/catalog/product-card';
import { ReportSheet } from '@/features/catalog/report-sheet';
import { ReviewItem } from '@/features/catalog/review-item';
import { useVariantSelection, VariantPicker } from '@/features/catalog/variant-picker';
import { formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Badge, Button, Card, Divider, ErrorState, Icon, IconButton, PriceTag, QuantityStepper, Rating, Sheet, Skeleton, Tap, Text, toast } from '@/ui';

export default function ProductScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProduct(id);
  const p = product.data;
  const brand = useBrand(p?.brand.slug ?? '');
  const reviews = useReviews(id);
  const cart = useCartMutations(p?.brand.id ?? '');
  const requireAuth = useRequireAuth();

  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [missing, setMissing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [allReviews, setAllReviews] = useState(false);
  const sel = useVariantSelection(p?.variants ?? [], size, color);
  const v = sel.selected;
  const galleryH = Math.min(width * 1.15, 560);

  if (product.isLoading) return <ProductSkeleton height={galleryH} />;
  if (product.error || !p)
    return (
      <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: insets.top }]}>
        <IconButton icon={ArrowRight} label="رجوع" onPress={() => router.back()} />
        <ErrorState error={product.error} onRetry={() => product.refetch()} />
      </View>
    );

  const price = v?.price ?? p.price;
  const max = Math.max(1, Math.min(v?.available ?? 20, 20));
  const shipping = brand.data?.shipping;
  const reviewItems = flatPages(reviews.data);
  const totalReviews = reviews.data?.pages[0]?.meta.total ?? 0;

  const add = () =>
    requireAuth('سجّل عشان تضيف للسلة وتطلب.', () => {
      if (!v) {
        setMissing(true);
        haptic.warning();
        return;
      }
      cart.add.mutate(
        { productId: p.id, variantId: v.id, quantity: qty },
        {
          onSuccess: () => {
            haptic.success();
            toast.success('اتضاف للسلة', { label: 'عرض السلة', onPress: () => router.push('/cart') });
          },
          onError: (e) => {
            haptic.error();
            toast.error(errorMessage(e));
          },
        },
      );
    });

  const share = () =>
    Share.share({ message: `شوف "${p.title}" من ${p.brand.name ?? ''} على براندك\nbrandak://product/${p.id}` }).catch(() => undefined);

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Gallery images={p.images.length ? p.images : p.imageUrl ? [p.imageUrl] : []} height={galleryH} />

        <Animated.View entering={FadeInDown.duration(260)} style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.flex}>
              <Text variant="section" style={styles.title}>
                {p.title}
              </Text>
              <Rating value={p.ratingAvg} count={p.ratingCount} />
            </View>
            <WishlistHeart productId={p.id} size={44} floating={false} />
          </View>
          <PriceTag price={price} compareAt={p.compareAtPrice} size="lg" />
          {!p.inStock ? (
            <Badge label="نفدت الكمية" tone="danger" />
          ) : v && v.available <= 3 && v.inStock ? (
            <Badge label={`باقي ${v.available} قطع بس`} tone="warning" />
          ) : null}

          <VariantPicker
            sizes={sel.sizes}
            colors={sel.colors}
            size={size}
            color={color}
            onSize={(s) => {
              haptic.tap();
              setSize(s);
              setMissing(false);
            }}
            onColor={(c) => {
              haptic.tap();
              setColor(c);
              setMissing(false);
            }}
            sizeAvailable={sel.sizeAvailable}
            colorAvailable={sel.colorAvailable}
            missing={missing}
          />

          <View style={styles.qtyRow}>
            <Text variant="ui" color="ink2">
              الكمية
            </Text>
            <QuantityStepper value={Math.min(qty, max)} onChange={setQty} max={max} />
          </View>

          {/* Brand */}
          <Tap
            onPress={() => p.brand.slug && router.push({ pathname: '/brand/[slug]', params: { slug: p.brand.slug } })}
            accessibilityLabel={`زيارة براند ${p.brand.name}`}
            pressScale={0.99}
          >
            <Card style={styles.brandCard}>
              <BrandLogo uri={p.brand.logoUrl} size={48} name={p.brand.name} />
              <View style={styles.flex}>
                <View style={styles.inline}>
                  <Text variant="bodyStrong">{p.brand.name}</Text>
                  <BadgeCheck size={16} color={t.c.brand} />
                </View>
                <Text variant="meta" color="ink3">
                  زور متجر البراند
                </Text>
              </View>
              <Icon as={ChevronLeft} color="ink3" />
            </Card>
          </Tap>

          {/* Delivery & trust */}
          <Card style={styles.gap}>
            <InfoRow icon={Wallet} title="الدفع عند الاستلام" body="مفيش أي دفع مقدّم" />
            <Divider />
            <InfoRow
              icon={Truck}
              title={
                shipping?.defaultFee != null ? `الشحن من ${formatMoney(Math.min(shipping.defaultFee, ...shipping.zones.map((z) => z.fee)))}` : 'الشحن حسب المحافظة'
              }
              body={
                shipping
                  ? [
                      shipping.freeShippingThreshold != null && `مجاني للطلبات فوق ${formatMoney(shipping.freeShippingThreshold)}`,
                      `التجهيز خلال ${shipping.processingDays} يوم`,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : 'هيتحسب في صفحة إتمام الطلب'
              }
            />
            {!!shipping?.returnPolicy && (
              <>
                <Divider />
                <InfoRow icon={Undo2} title="سياسة الاسترجاع" body={shipping.returnPolicy} />
              </>
            )}
          </Card>

          {!!p.description && (
            <View style={styles.gap}>
              <Text variant="section">عن المنتج</Text>
              <Text variant="body" color="ink2">
                {p.description}
              </Text>
            </View>
          )}

          {/* Reviews */}
          <View style={styles.gap}>
            <View style={styles.inlineBetween}>
              <Text variant="section">التقييمات {totalReviews ? `(${totalReviews})` : ''}</Text>
              {totalReviews > 3 && (
                <Tap onPress={() => setAllReviews(true)} hitSlop={10} pressScale={1}>
                  <Text variant="ui" color="accent">
                    عرض الكل
                  </Text>
                </Tap>
              )}
            </View>
            {reviews.isLoading ? (
              <Skeleton height={80} />
            ) : reviewItems.length ? (
              reviewItems.slice(0, 3).map((r) => <ReviewItem key={r.id} review={r} />)
            ) : (
              <Text variant="ui" color="ink3">
                لسه مفيش تقييمات. التقييمات بتيجي من ناس استلمت المنتج فعلاً.
              </Text>
            )}
          </View>

          <Tap onPress={() => requireAuth('سجّل عشان تبلّغ.', () => setReportOpen(true))} style={styles.report} pressScale={1}>
            <Icon as={Flag} size={16} color="ink3" />
            <Text variant="meta" color="ink3">
              الإبلاغ عن المنتج
            </Text>
          </Tap>
        </Animated.View>
      </ScrollView>

      {/* Floating top controls over the gallery */}
      <View style={[styles.topBar, { top: insets.top + 6 }]} pointerEvents="box-none">
        <IconButton icon={ArrowRight} label="رجوع" background="surface" onPress={() => router.back()} />
        <IconButton icon={Share2} label="مشاركة" background="surface" onPress={share} />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: t.c.surface, borderTopColor: t.c.line }]}>
        <View>
          <Text variant="meta" color="ink3">
            الإجمالي
          </Text>
          <Text variant="section">{formatMoney(price * Math.min(qty, max))}</Text>
        </View>
        <Button
          label={p.inStock ? 'أضف للسلة' : 'نفدت الكمية'}
          icon={ShoppingBag}
          disabled={!p.inStock || (v && !v.inStock)}
          loading={cart.add.isPending}
          onPress={add}
          style={styles.flex}
        />
      </View>

      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetType="PRODUCT" targetId={p.id} />
      <Sheet open={allReviews} onClose={() => setAllReviews(false)} title="كل التقييمات">
        {reviewItems.map((r) => (
          <ReviewItem key={r.id} review={r} />
        ))}
        {reviews.hasNextPage && (
          <Button label="تحميل المزيد" variant="secondary" loading={reviews.isFetchingNextPage} onPress={() => reviews.fetchNextPage()} />
        )}
      </Sheet>
    </View>
  );
}

function InfoRow({ icon, title, body }: { icon: typeof Truck; title: string; body: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon as={icon} color="accent" size={22} />
      <View style={styles.flex}>
        <Text variant="ui" weight="semibold">
          {title}
        </Text>
        <Text variant="meta" color="ink2">
          {body}
        </Text>
      </View>
    </View>
  );
}

function ProductSkeleton({ height }: { height: number }) {
  const t = useTheme();
  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <Skeleton height={height} radius={0} />
      <View style={[styles.body, { gap: 12 }]}>
        <Skeleton width="80%" height={24} />
        <Skeleton width="40%" height={28} />
        <Skeleton height={44} />
        <Skeleton height={90} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: 16, gap: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { marginBottom: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gap: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  report: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', height: 44 },
  topBar: { position: 'absolute', start: 12, end: 12, flexDirection: 'row', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
