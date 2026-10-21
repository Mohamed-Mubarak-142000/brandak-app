import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, BadgeCheck, ChevronLeft, Flag, Share2, ShieldCheck, ShoppingBag, Truck, Undo2, Wallet, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { flatPages, useBrand, useCartMutations, useProduct, useReviews } from '@/api/queries';
import { useIsSeller, useRequireAuth } from '@/auth/use-auth';
import { BrandLogo } from '@/features/catalog/brand-card';
import { Countdown } from '@/features/catalog/countdown';
import { Gallery } from '@/features/catalog/gallery';
import { WishlistHeart } from '@/features/catalog/product-card';
import { ProductAlerts, WholesaleTable } from '@/features/catalog/product-alerts';
import { QuestionsSection } from '@/features/catalog/questions';
import { ReportSheet } from '@/features/catalog/report-sheet';
import { ReviewItem } from '@/features/catalog/review-item';
import { imagesForColor, useVariantSelection, VariantPicker } from '@/features/catalog/variant-picker';
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
  // Store accounts only preview products; they cannot buy.
  const seller = useIsSeller();

  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [missing, setMissing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [allReviews, setAllReviews] = useState(false);
  const sel = useVariantSelection(p?.variants ?? [], size, color);
  const v = sel.selected;
  const galleryW = width - 24;
  const galleryH = Math.min(galleryW * 1.1, 520);
  const [descOpen, setDescOpen] = useState(false);

  if (product.isLoading) return <ProductSkeleton width={galleryW} height={galleryH} top={insets.top + 8} />;
  if (product.error || !p)
    return (
      <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: insets.top }]}>
        <IconButton icon={ArrowRight} label="رجوع" onPress={() => router.back()} />
        <ErrorState error={product.error} onRetry={() => product.refetch()} />
      </View>
    );

  const minQty = p.wholesale?.minQty ?? 1;
  // Wholesale: the best tier the chosen quantity reaches (all sizes together at checkout).
  const tier = [...(p.wholesale?.tiers ?? [])].reverse().find((x) => qty >= x.minQty);
  const regular = v?.price ?? p.price;
  const price = tier && tier.price < regular ? tier.price : regular;
  const max = Math.max(minQty, Math.min(v?.available ?? 20, p.wholesale ? 1000 : 20));
  const shipping = brand.data?.shipping;
  const reviewItems = flatPages(reviews.data);
  const totalReviews = reviews.data?.pages[0]?.meta.total ?? 0;

  const total = price * Math.max(minQty, Math.min(qty, max));
  // Picking a colour shows that colour's photos (the gallery restarts at its first one).
  const gallery = imagesForColor(p.images.length ? p.images : p.imageUrl ? [p.imageUrl] : [], p.images.length ? p.imageColors : undefined, color);
  const soldOut = !p.inStock || (!!v && !v.inStock);

  /** `buyNow` skips the cart screen and goes straight to checkout for this store. */
  const add = (buyNow = false) =>
    requireAuth('سجّل عشان تضيف للسلة وتطلب.', () => {
      if (!v) {
        setMissing(true);
        haptic.warning();
        return;
      }
      cart.add.mutate(
        { productId: p.id, variantId: v.id, quantity: Math.max(minQty, Math.min(qty, max)) },
        {
          onSuccess: () => {
            haptic.success();
            if (buyNow) router.push({ pathname: '/checkout/[brandId]', params: { brandId: p.brand.id } });
            else toast.success('اتضاف للسلة', { label: 'عرض السلة', onPress: () => router.push('/cart') });
          },
          onError: (e) => {
            haptic.error();
            toast.error(errorMessage(e));
          },
        },
      );
    });

  const share = () =>
    Share.share({ message: `شوف "${p.title}" من ${p.brand.name ?? ''} على فاترينة\nfatrina://product/${p.id}` }).catch(() => undefined);

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}>
        <Gallery key={color ?? 'all'} images={gallery} width={galleryW} height={galleryH}>
          {/* Floating controls inside the image card */}
          <View style={styles.topBar} pointerEvents="box-none">
            <IconButton icon={ArrowRight} label="رجوع" background="surface" onPress={() => router.back()} />
            <View style={styles.inline}>
              <IconButton icon={Share2} label="مشاركة" background="surface" onPress={share} />
              <View style={[styles.heartWrap, { backgroundColor: t.c.surface }]}>
                <WishlistHeart productId={p.id} size={44} floating={false} />
              </View>
            </View>
          </View>
        </Gallery>

        <Animated.View entering={FadeInDown.duration(260)} style={styles.body}>
          <View style={[styles.sheet, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.xl }]}>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text variant="section" style={styles.title}>
                  {p.title}
                </Text>
                <Rating value={p.ratingAvg} count={p.ratingCount} />
              </View>
              {p.inStock && <QuantityStepper value={Math.max(minQty, Math.min(qty, max))} onChange={setQty} min={minQty} max={max} compact />}
            </View>

            <View style={styles.priceRow}>
              <PriceTag price={price} compareAt={p.compareAtPrice} size="lg" />
              {p.sale && <Countdown endsAt={p.sale.endsAt} />}
              {!p.inStock ? (
                <Badge label="نفدت الكمية" tone="danger" />
              ) : v && v.available <= 3 && v.inStock ? (
                <Badge label={`باقي ${v.available} قطع بس`} tone="warning" />
              ) : null}
            </View>

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

            {p.wholesale && <WholesaleTable wholesale={p.wholesale} price={regular} />}
            {!seller && <ProductAlerts productId={p.id} variantId={v?.id ?? null} soldOut={soldOut} />}

            {!!p.description && (
              <View style={styles.gapSm}>
                <Text variant="bodyStrong">الوصف</Text>
                <Text variant="ui" color="ink2" numberOfLines={descOpen ? undefined : 3}>
                  {p.description}
                </Text>
                {p.description.length > 140 && (
                  <Tap onPress={() => setDescOpen((o) => !o)} hitSlop={10} pressScale={1} style={styles.more}>
                    <Text variant="ui" color="accent" weight="semibold">
                      {descOpen ? 'أقل' : 'اقرأ أكتر'}
                    </Text>
                  </Tap>
                )}
              </View>
            )}
          </View>

          {/* Brand */}
          <Tap
            onPress={() => p.brand.slug && router.push({ pathname: '/brand/[slug]', params: { slug: p.brand.slug } })}
            accessibilityLabel={`زيارة متجر ${p.brand.name}`}
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
                  زور المتجر
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
            {shipping && (
              <>
                <Divider />
                <InfoRow
                  icon={Undo2}
                  title={shipping.returnDays === 0 ? 'المتجر مش بيقبل مرتجعات' : `إرجاع خلال ${shipping.returnDays ?? 14} يوم من الاستلام`}
                  body={shipping.returnPolicy || (shipping.returnDays === 0 ? 'اتأكد من المقاس والتفاصيل قبل الطلب' : 'من صفحة الطلب، بالصور والسبب')}
                />
              </>
            )}
            <Divider />
            <InfoRow icon={ShieldCheck} title="حماية فاترينة" body="لو الطلب موصلش أو طلع مختلف عن الصور، افتح شكوى وإحنا نحلها" />
          </Card>

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

          <QuestionsSection productId={p.id} canAsk={!seller} />

          <Tap onPress={() => requireAuth('سجّل عشان تبلّغ.', () => setReportOpen(true))} style={styles.report} pressScale={1}>
            <Icon as={Flag} size={16} color="ink3" />
            <Text variant="meta" color="ink3">
              الإبلاغ عن المنتج
            </Text>
          </Tap>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: t.c.surface, borderTopColor: t.c.line }]}>
        <View style={styles.inlineBetween}>
          <Text variant="ui" color="ink3">
            الإجمالي
          </Text>
          <Text variant="bodyStrong" style={{ fontFamily: t.fonts.bold }}>
            {formatMoney(total)}
          </Text>
        </View>
        {seller ? (
          <Text variant="ui" color="ink3" align="center">
            دي معاينة للمنتج زي ما العميل بيشوفه
          </Text>
        ) : soldOut ? (
          <Button label="نفدت الكمية" disabled />
        ) : (
          <View style={styles.actions}>
            <Button label="أضف للسلة" icon={ShoppingBag} variant="soft" disabled={cart.add.isPending} onPress={() => add(false)} style={styles.flex} />
            <Button label="اشتري دلوقتي" icon={Zap} loading={cart.add.isPending} onPress={() => add(true)} style={styles.flex} />
          </View>
        )}
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

function ProductSkeleton({ width, height, top }: { width: number; height: number; top: number }) {
  const t = useTheme();
  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: top, alignItems: 'center' }]}>
      <Skeleton width={width} height={height} radius={t.radius.xl} />
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
  body: { padding: 12, gap: 16, alignSelf: 'stretch' },
  sheet: { padding: 16, gap: 18, borderWidth: StyleSheet.hairlineWidth },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { marginBottom: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  gapSm: { gap: 6 },
  more: { alignSelf: 'flex-start' },
  heartWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  brandCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gap: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  report: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', height: 44 },
  topBar: { position: 'absolute', top: 12, start: 12, end: 12, flexDirection: 'row', justifyContent: 'space-between' },
  footer: { gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
