import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, AtSign, BadgeCheck, ChevronDown, Clock, Flag, Globe, MessageCircle, Package, Share2, Store, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flatPages, useBrand, useProducts } from '@/api/queries';
import type { PublicBrand } from '@/api/types';
import { useRequireAuth } from '@/auth/use-auth';
import { BrandLogo } from '@/features/catalog/brand-card';
import { FollowButton } from '@/features/catalog/follow-button';
import { FilterBar, productQuery, type ProductFilters } from '@/features/catalog/filters';
import { ProductGrid } from '@/features/catalog/product-grid';
import { ReportSheet } from '@/features/catalog/report-sheet';
import { StoreTypeBadge } from '@/features/catalog/store-type-ui';
import { formatMoney } from '@/lib/format';
import { useTheme } from '@/theme';
import { Banner, ErrorState, Icon, IconButton, Rating, Skeleton, Tap, Text } from '@/ui';

export default function BrandScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const brand = useBrand(slug);
  const [filters, setFilters] = useState<ProductFilters>({});
  const products = useProducts({ ...productQuery(filters), brandSlug: slug });
  const [reportOpen, setReportOpen] = useState(false);
  const requireAuth = useRequireAuth();
  const b = brand.data;

  if (brand.error)
    return (
      <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: insets.top }]}>
        <IconButton icon={ArrowRight} label="رجوع" onPress={() => router.back()} />
        <ErrorState error={brand.error} onRetry={() => brand.refetch()} />
      </View>
    );

  const header = (
    <View style={styles.headerWrap}>
      <View style={[styles.cover, { backgroundColor: t.c.accentSoft, marginHorizontal: -16 }]}>
        {b?.coverUrl && <Image source={b.coverUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />}
      </View>
      {!b ? (
        <View style={styles.gap}>
          <Skeleton width={84} height={84} radius={42} style={{ marginTop: -42 }} />
          <Skeleton width="50%" height={24} />
          <Skeleton height={60} />
        </View>
      ) : (
        <BrandInfo brand={b} onReport={() => requireAuth('سجّل عشان تبلّغ.', () => setReportOpen(true))} />
      )}
      <Text variant="section" style={styles.productsTitle}>
        المنتجات {products.data ? `(${products.data.pages[0]?.meta.total ?? 0})` : ''}
      </Text>
      <View style={{ marginHorizontal: -16 }}>
        <FilterBar value={filters} onChange={setFilters} />
      </View>
      <View style={{ height: 8 }} />
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <ProductGrid
        items={flatPages(products.data)}
        isLoading={products.isLoading}
        error={products.error}
        onRetry={() => products.refetch()}
        onEndReached={() => products.hasNextPage && !products.isFetchingNextPage && products.fetchNextPage()}
        loadingMore={products.isFetchingNextPage}
        header={header}
      />
      <View style={[styles.topBar, { top: insets.top + 6 }]} pointerEvents="box-none">
        <IconButton icon={ArrowRight} label="رجوع" background="surface" onPress={() => router.back()} />
        {b && (
          <IconButton
            icon={Share2}
            label="مشاركة المتجر"
            background="surface"
            onPress={() => Share.share({ message: `اكتشف ${b.name} على فاترينة\nfatrina://brand/${b.slug}` }).catch(() => undefined)}
          />
        )}
      </View>
      {b && <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} targetType="BRAND" targetId={b.id} />}
    </View>
  );
}

function BrandInfo({ brand: b, onReport }: { brand: PublicBrand; onReport: () => void }) {
  const t = useTheme();
  const [policies, setPolicies] = useState(false);
  const s = b.shipping;
  const minFee = Math.min(...[s.defaultFee, ...s.zones.map((z) => z.fee)].filter((x): x is number => x != null));
  const socials = [
    b.socialLinks?.instagram && { icon: AtSign, label: 'إنستجرام', url: b.socialLinks.instagram },
    b.socialLinks?.website && { icon: Globe, label: 'الموقع', url: b.socialLinks.website },
    b.contact?.whatsapp && { icon: MessageCircle, label: 'واتساب', url: `https://wa.me/${b.contact.whatsapp.replace(/\D/g, '')}` },
  ].filter(Boolean) as { icon: typeof Globe; label: string; url: string }[];

  return (
    <View style={styles.gap}>
      <View style={styles.logoRow}>
        <BrandLogo uri={b.logoUrl} size={84} name={b.name} />
      </View>
      <View style={styles.inline}>
        <Text variant="page">{b.name}</Text>
        <BadgeCheck size={20} color={t.c.brand} accessibilityLabel="متجر معتمد" />
      </View>
      <StoreTypeBadge type={b.storeType} />
      <Rating value={b.ratingAvg} count={b.ratingCount} />
      <FollowButton brandId={b.id} />
      {!!b.description && (
        <Text variant="body" color="ink2">
          {b.description}
        </Text>
      )}
      {!s.acceptsOrders && <Banner icon={Clock} tone="warning" title="المتجر مش بيستقبل طلبات دلوقتي" body="تقدر تتصفح وتحفظ في المفضلة لحد ما يرجع." />}

      <View style={styles.facts}>
        <Fact icon={Truck} label="الشحن" value={Number.isFinite(minFee) ? `من ${formatMoney(minFee)}` : 'حسب المحافظة'} />
        <Fact icon={Package} label="التجهيز" value={`${s.processingDays} يوم`} />
        {s.freeShippingThreshold != null && <Fact icon={BadgeCheck} label="شحن مجاني" value={`فوق ${formatMoney(s.freeShippingThreshold)}`} />}
        {s.pickup?.enabled && <Fact icon={Store} label="استلام" value="من المتجر" />}
      </View>
      {s.minOrderAmount > 0 && (
        <Text variant="meta" color="ink3">
          أقل قيمة للطلب {formatMoney(s.minOrderAmount)}
        </Text>
      )}

      {socials.length > 0 && (
        <View style={styles.socials}>
          {socials.map((x) => (
            <Tap
              key={x.label}
              onPress={() => Linking.openURL(x.url.startsWith('http') ? x.url : `https://${x.url}`).catch(() => undefined)}
              style={[styles.social, { borderColor: t.c.line, backgroundColor: t.c.surface }]}
              accessibilityRole="link"
              accessibilityLabel={x.label}
            >
              <Icon as={x.icon} size={18} color="ink2" />
              <Text variant="meta" color="ink2">
                {x.label}
              </Text>
            </Tap>
          ))}
        </View>
      )}

      {(!!s.shippingPolicy || !!s.returnPolicy) && (
        <View style={[styles.policies, { borderColor: t.c.line, backgroundColor: t.c.surface, borderRadius: t.radius.md }]}>
          <Tap onPress={() => setPolicies((x) => !x)} pressScale={1} style={styles.policyHead} accessibilityState={{ expanded: policies }}>
            <Text variant="ui" weight="semibold">
              سياسات الشحن والاسترجاع
            </Text>
            <View style={{ transform: [{ rotate: policies ? '180deg' : '0deg' }] }}>
              <ChevronDown size={20} color={t.c.ink2} />
            </View>
          </Tap>
          {policies && (
            <View style={styles.gapSm}>
              {!!s.shippingPolicy && (
                <Text variant="ui" color="ink2">
                  <Text variant="ui" weight="bold">
                    الشحن:{' '}
                  </Text>
                  {s.shippingPolicy}
                </Text>
              )}
              {!!s.returnPolicy && (
                <Text variant="ui" color="ink2">
                  <Text variant="ui" weight="bold">
                    الاسترجاع:{' '}
                  </Text>
                  {s.returnPolicy}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
      <Tap onPress={onReport} pressScale={1} style={styles.report}>
        <Icon as={Flag} size={14} color="ink3" />
        <Text variant="meta" color="ink3">
          الإبلاغ عن المتجر
        </Text>
      </Tap>
    </View>
  );
}

function Fact({ icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={[styles.fact, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.md }]}>
      <Icon as={icon} size={20} color="accent" />
      <Text variant="meta" color="ink3">
        {label}
      </Text>
      <Text variant="ui" weight="semibold" align="center">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrap: { gap: 12, paddingBottom: 4 },
  cover: { height: 190 },
  logoRow: { marginTop: -54 },
  gap: { gap: 10 },
  gapSm: { gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  facts: { flexDirection: 'row', gap: 10 },
  fact: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12, paddingHorizontal: 6, borderWidth: 1 },
  socials: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  social: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  policies: { borderWidth: 1, padding: 12, gap: 10 },
  policyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  report: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36 },
  productsTitle: { marginTop: 10 },
  topBar: { position: 'absolute', start: 12, end: 12, flexDirection: 'row', justifyContent: 'space-between' },
});
