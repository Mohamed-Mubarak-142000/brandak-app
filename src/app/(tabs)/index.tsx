import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bell, Search, ShieldCheck, Truck, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flatPages, useBrands, useCampaigns, useCategories, useFeatured, useFollowingFeed, useProducts, useUnreadCount } from '@/api/queries';
import type { ProductCard as ProductCardData } from '@/api/types';
import { Countdown } from '@/features/catalog/countdown';
import { useMe } from '@/auth/use-auth';
import { BrandBubble } from '@/features/catalog/brand-card';
import { ProductCard } from '@/features/catalog/product-card';
import { CategoryTiles } from '@/features/home/category-tiles';
import { HeroSlider } from '@/features/home/hero-slider';
import { InlineEmpty } from '@/features/home/inline-empty';
import { STORE_TYPES } from '@/features/catalog/store-types';
import { ProductSkeleton, useCardWidth } from '@/features/catalog/product-grid';
import { PREF, prefs } from '@/lib/storage';
import { useTheme } from '@/theme';
import { BrandMark } from '@/ui/brand-mark';
import { ErrorState, Icon, IconButton, SectionHeader, Skeleton, Tap, Text } from '@/ui';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'صباح الخير' : h < 18 ? 'نهارك سعيد' : 'مساء الخير';
}

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = useCardWidth();
  const me = useMe();
  const unread = useUnreadCount();
  const categories = useCategories();
  const featured = useBrands({ sort: 'rating' }, 8);
  const fresh = useBrands({ sort: 'newest' }, 12);
  const popular = useProducts({ sort: 'popular' }, 10);
  const latest = useProducts({ sort: 'newest' }, 10);
  const deals = useProducts({ onSale: true, sort: 'discount' }, 10);
  const campaigns = useCampaigns();
  const sponsored = useFeatured();
  const following = useFollowingFeed(true, 10);
  const [now] = useState(() => Date.now());
  const season = campaigns.data?.find((c) => new Date(c.startsAt).getTime() <= now + 7 * 86_400_000);
  const [refreshing, setRefreshing] = useState(false);

  const interests = useMemo(() => prefs.get<string[]>(PREF.interests, []), []);
  const roots = useMemo(() => {
    const list = (categories.data ?? []).filter((c) => c.isActive && !c.parentId);
    return [...list].sort((a, b) => Number(interests.includes(b._id)) - Number(interests.includes(a._id)) || a.sortOrder - b.sortOrder);
  }, [categories.data, interests]);
  const forYou = useProducts({ categoryId: interests[0], sort: 'popular' }, 10);

  const featuredList = flatPages(featured.data);
  const allFailed = featured.isError && popular.isError && latest.isError;

  const refresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ predicate: (q) => ['brands', 'products', 'categories', 'notifications', 'campaigns'].includes(String(q.queryKey[0])) });
    setRefreshing(false);
  };

  const firstName = me.data?.name.split(' ')[0];

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headRow}>
          <View style={styles.brandRow}>
            <BrandMark size={30} />
            <View>
              <Text variant="meta" color="ink3">
                {greeting()}
                {firstName ? `، ${firstName}` : ''}
              </Text>
              <Text variant="section" color="brand" style={styles.logoText}>
                Fatrina
              </Text>
            </View>
          </View>
          <IconButton icon={Bell} label="الإشعارات" badge={unread.data} background="surface" onPress={() => router.push('/notifications')} />
        </View>
        <Tap
          onPress={() => router.push('/search')}
          pressScale={0.99}
          style={[styles.search, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.md }]}
          accessibilityRole="search"
          accessibilityLabel="ابحث عن منتج أو متجر"
        >
          <Icon as={Search} size={20} color="ink3" />
          <Text variant="body" color="ink3">
            ابحث عن منتج أو متجر...
          </Text>
        </Tap>
      </View>

      {allFailed ? (
        <ErrorState error={featured.error} onRetry={refresh} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32, gap: 26 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.c.brand} colors={[t.c.brand]} />}
        >
          {/* Hero: promo banners + top-rated stores, auto-playing and endless */}
          <HeroSlider featured={featuredList} />

          {/* A running (or next-week) season: White Friday, Ramadan... */}
          {season && (
            <Tap onPress={() => router.push({ pathname: '/offers', params: { campaign: season.slug } })} pressScale={0.99} style={styles.mx} accessibilityLabel={season.nameAr}>
              <View style={[styles.season, { backgroundColor: season.color, borderRadius: t.radius.lg }]}>
                <View style={styles.flex}>
                  <Text variant="section" style={styles.onColor}>
                    {season.nameAr}
                  </Text>
                  <Text variant="meta" style={styles.onColor}>
                    {season.descriptionAr || 'خصومات لفترة محدودة من متاجر فاترينة'}
                  </Text>
                </View>
                <Countdown endsAt={new Date(season.startsAt).getTime() > now ? season.startsAt : season.endsAt} prefix={new Date(season.startsAt).getTime() > now ? 'بيبدأ خلال' : 'باقي'} />
              </View>
            </Tap>
          )}

          {/* Trust strip */}
          <Animated.View entering={FadeIn.duration(300)} style={[styles.trust, styles.mx, { backgroundColor: t.c.accentSoft, borderRadius: t.radius.lg }]}>
            {[
              { icon: Wallet, label: 'الدفع عند الاستلام' },
              { icon: Truck, label: 'توصيل لكل المحافظات' },
              { icon: ShieldCheck, label: 'متاجر معتمدة' },
            ].map((x) => (
              <View key={x.label} style={styles.trustItem}>
                <Icon as={x.icon} size={20} color="accent" />
                <Text variant="meta" color="accent" weight="semibold" align="center">
                  {x.label}
                </Text>
              </View>
            ))}
          </Animated.View>

          {/* Store types: brands, showrooms, warehouses, shops */}
          <View style={styles.gap}>
            <View style={styles.mx}>
              <SectionHeader title="تسوّق حسب نوع المتجر" />
            </View>
            <View style={[styles.types, styles.mx]}>
              {STORE_TYPES.map((st) => (
                <Tap
                  key={st.type}
                  onPress={() => router.push({ pathname: '/explore', params: { storeType: st.type } })}
                  style={[styles.typeCard, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.lg }]}
                  accessibilityLabel={`تصفح ${st.plural}`}
                >
                  <View style={[styles.typeIcon, { backgroundColor: t.c.accentSoft }]}>
                    <Icon as={st.icon} size={22} color="accent" />
                  </View>
                  <Text variant="ui" weight="semibold" align="center">
                    {st.plural}
                  </Text>
                </Tap>
              ))}
            </View>
          </View>

          {/* Categories */}
          <View style={styles.gap}>
            <View style={styles.mx}>
              <SectionHeader title="تسوّق حسب القسم" action="الكل" onAction={() => router.push('/explore')} />
            </View>
            <CategoryTiles categories={roots} loading={categories.isLoading} />
          </View>

          {interests.length > 0 && (
            <ProductRail title="مختارات على ذوقك" query={forYou} width={cardW} onMore={() => router.push({ pathname: '/category/[id]', params: { id: interests[0] } })} />
          )}

          {flatPages(following.data).length > 0 && (
            <ProductRail title="من متاجر بتتابعها" query={following} width={cardW} onMore={() => router.push('/following')} />
          )}
          {!!sponsored.data?.length && <FeaturedRail items={sponsored.data} width={cardW} />}
          {flatPages(deals.data).length > 0 && <ProductRail title="عروض النهارده" query={deals} width={cardW} onMore={() => router.push('/offers')} />}

          <ProductRail title="الأكثر مبيعاً" query={popular} width={cardW} onMore={() => router.push({ pathname: '/explore', params: { sort: 'popular' } })} />

          {/* New brands */}
          <View style={styles.gap}>
            <View style={styles.mx}>
              <SectionHeader title="متاجر جديدة" action="عرض الكل" onAction={() => router.push({ pathname: '/explore', params: { tab: 'brands' } })} />
            </View>
            <FlatList
              horizontal
              data={flatPages(fresh.data)}
              keyExtractor={(b) => b.id}
              renderItem={({ item }) => <BrandBubble brand={item} />}
              contentContainerStyle={styles.rail}
              showsHorizontalScrollIndicator={false}
              ListEmptyComponent={
                fresh.isLoading ? (
                  <View style={styles.row}>
                    {Array.from({ length: 4 }, (_, i) => (
                      <Skeleton key={i} width={68} height={68} radius={34} />
                    ))}
                  </View>
                ) : fresh.isError ? (
                  <InlineEmpty art="error" title="تعذّر تحميل المتاجر" body="اسحب لتحت عشان تحدّث الصفحة." width={width - 32} />
                ) : (
                  <InlineEmpty art="store" title="لسه مفيش متاجر جديدة" body="أول ما متجر جديد ينضم لفاترينة هيظهر هنا." width={width - 32} />
                )
              }
            />
          </View>

          <ProductRail title="وصل حديثاً" query={latest} width={cardW} onMore={() => router.push({ pathname: '/explore', params: { sort: 'newest' } })} />
        </ScrollView>
      )}
    </View>
  );
}

/** Paid home placements, labelled «مُموَّل» on each card. */
function FeaturedRail({ items, width }: { items: ProductCardData[]; width: number }) {
  return (
    <View style={styles.gap}>
      <View style={styles.mx}>
        <SectionHeader title="مميز" />
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <ProductCard product={item} width={width} />}
        contentContainerStyle={styles.rail}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

function ProductRail({ title, query, width, onMore }: { title: string; query: ReturnType<typeof useProducts>; width: number; onMore: () => void }) {
  const items = flatPages(query.data);
  if (!query.isLoading && !items.length) return null;
  return (
    <View style={styles.gap}>
      <View style={styles.mx}>
        <SectionHeader title={title} action="عرض الكل" onAction={onMore} />
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <ProductCard product={item} width={width} />}
        contentContainerStyle={styles.rail}
        showsHorizontalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.row}>
            {[0, 1, 2].map((i) => (
              <ProductSkeleton key={i} width={width} />
            ))}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  season: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  onColor: { color: '#fff' },
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10, gap: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoText: { lineHeight: 26 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 14, borderWidth: 1 },
  pad: { paddingHorizontal: 16 },
  mx: { marginHorizontal: 16 },
  rail: { paddingHorizontal: 16, gap: 12 },
  chips: { paddingHorizontal: 16, gap: 8 },
  gap: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  types: { flexDirection: 'row', gap: 8 },
  typeCard: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderWidth: 1 },
  typeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  trust: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 8 },
  trustItem: { flex: 1, alignItems: 'center', gap: 6 },
});
