import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bell, Search, ShieldCheck, Truck, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flatPages, useBrands, useCategories, useProducts, useUnreadCount } from '@/api/queries';
import { useMe } from '@/auth/use-auth';
import { BrandBubble, BrandCard } from '@/features/catalog/brand-card';
import { ProductCard } from '@/features/catalog/product-card';
import { ProductSkeleton, useCardWidth } from '@/features/catalog/product-grid';
import { PREF, prefs } from '@/lib/storage';
import { useTheme } from '@/theme';
import { BrandMark } from '@/ui/brand-mark';
import { Chip, ErrorState, Icon, IconButton, SectionHeader, Skeleton, Tap, Text } from '@/ui';

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
  const [refreshing, setRefreshing] = useState(false);

  const interests = useMemo(() => prefs.get<string[]>(PREF.interests, []), []);
  const roots = useMemo(() => {
    const list = (categories.data ?? []).filter((c) => c.isActive && !c.parentId);
    return [...list].sort((a, b) => Number(interests.includes(b._id)) - Number(interests.includes(a._id)) || a.sortOrder - b.sortOrder);
  }, [categories.data, interests]);
  const forYou = useProducts({ categoryId: interests[0], sort: 'popular' }, 10);

  const heroW = Math.min(width - 48, 420);
  const featuredList = flatPages(featured.data);
  const allFailed = featured.isError && popular.isError && latest.isError;

  const refresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ predicate: (q) => ['brands', 'products', 'categories', 'notifications'].includes(String(q.queryKey[0])) });
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
                براندك
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
          accessibilityLabel="ابحث عن منتج أو براند"
        >
          <Icon as={Search} size={20} color="ink3" />
          <Text variant="body" color="ink3">
            ابحث عن منتج أو براند...
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
          {/* Hero rail: top-rated brands */}
          <View>
            {featured.isLoading ? (
              <View style={styles.pad}>
                <Skeleton width={heroW} height={heroW * 0.42 + 120} radius={16} />
              </View>
            ) : (
              <FlatList
                horizontal
                data={featuredList}
                keyExtractor={(b) => b.id}
                renderItem={({ item }) => <BrandCard brand={item} width={heroW} />}
                contentContainerStyle={styles.rail}
                showsHorizontalScrollIndicator={false}
                snapToInterval={heroW + 12}
                decelerationRate="fast"
              />
            )}
          </View>

          {/* Trust strip */}
          <Animated.View entering={FadeIn.duration(300)} style={[styles.trust, styles.mx, { backgroundColor: t.c.accentSoft, borderRadius: t.radius.lg }]}>
            {[
              { icon: Wallet, label: 'الدفع عند الاستلام' },
              { icon: Truck, label: 'توصيل لكل المحافظات' },
              { icon: ShieldCheck, label: 'براندات معتمدة' },
            ].map((x) => (
              <View key={x.label} style={styles.trustItem}>
                <Icon as={x.icon} size={20} color="accent" />
                <Text variant="meta" color="accent" weight="semibold" align="center">
                  {x.label}
                </Text>
              </View>
            ))}
          </Animated.View>

          {/* Categories */}
          <View style={styles.gap}>
            <View style={styles.mx}>
              <SectionHeader title="تسوّق حسب القسم" action="الكل" onAction={() => router.push('/explore')} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {categories.isLoading
                ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} width={90} height={40} radius={20} />)
                : roots.map((c) => (
                    <Chip
                      key={c._id}
                      label={c.nameAr}
                      selected={interests.includes(c._id)}
                      onPress={() => router.push({ pathname: '/category/[id]', params: { id: c._id, name: c.nameAr } })}
                    />
                  ))}
            </ScrollView>
          </View>

          {interests.length > 0 && (
            <ProductRail title="مختارات على ذوقك" query={forYou} width={cardW * 0.85} onMore={() => router.push({ pathname: '/category/[id]', params: { id: interests[0] } })} />
          )}

          <ProductRail title="الأكثر مبيعاً" query={popular} width={cardW * 0.85} onMore={() => router.push({ pathname: '/explore', params: { sort: 'popular' } })} />

          {/* New brands */}
          <View style={styles.gap}>
            <View style={styles.mx}>
              <SectionHeader title="براندات جديدة" action="عرض الكل" onAction={() => router.push({ pathname: '/explore', params: { tab: 'brands' } })} />
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
                ) : undefined
              }
            />
          </View>

          <ProductRail title="وصل حديثاً" query={latest} width={cardW * 0.85} onMore={() => router.push({ pathname: '/explore', params: { sort: 'newest' } })} />
        </ScrollView>
      )}
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
  trust: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 8 },
  trustItem: { flex: 1, alignItems: 'center', gap: 6 },
});
