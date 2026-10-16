import { Redirect, Tabs, useSegments } from 'expo-router';
import { type BottomTabBarProps } from 'expo-router/tabs';
import { LayoutDashboard, Package, ShoppingCart, Store, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useMyBrand } from '@/api/queries';
import { useMe } from '@/auth/use-auth';
import { BrandStatusScreen } from '@/features/seller/brand-status';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { ErrorState, Skeleton, Tap, Text } from '@/ui';

const TABS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'index', label: 'نظرة عامة', icon: LayoutDashboard },
  { name: 'orders', label: 'الطلبات', icon: ShoppingCart },
  { name: 'products', label: 'المنتجات', icon: Package },
  { name: 'store', label: 'المتجر', icon: Store },
];

/** The brand desk. Gated on the brand's state: no brand → apply; not ACTIVE → status page. */
export default function DeskLayout() {
  const t = useTheme();
  const me = useMe();
  const hasBrand = me.data ? !!me.data.brand : undefined;
  const brand = useMyBrand(hasBrand !== false);
  // Store settings stay reachable while the brand is under review or rejected (to fix and resubmit).
  const onStore = useSegments().at(-1) === 'store';

  if (hasBrand === false || (brand.error instanceof ApiError && brand.error.code === 'NO_BRAND')) return <Redirect href="/seller/apply" />;
  if (me.isLoading || brand.isLoading)
    return (
      <View style={[styles.flex, { backgroundColor: t.c.ground, padding: 16, gap: 12, paddingTop: 80 }]}>
        <Skeleton height={28} width="50%" />
        <Skeleton height={120} />
        <Skeleton height={200} />
      </View>
    );
  if (brand.error || !brand.data) return <ErrorState error={brand.error} onRetry={() => brand.refetch()} />;
  if (brand.data.status !== 'ACTIVE' && !onStore) return <BrandStatusScreen brand={brand.data} />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <DeskBar {...props} />}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}

function DeskBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: t.c.ink }]} accessibilityRole="tabbar">
      {state.routes.map((route, i) => {
        const tab = TABS.find((x) => x.name === route.name);
        if (!tab) return null;
        const focused = state.index === i;
        const Glyph = tab.icon;
        return (
          <Tap
            key={route.key}
            onPress={() => {
              const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) {
                haptic.tap();
                navigateToTab(route.key);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            style={styles.item}
          >
            <View style={[styles.pill, focused && { backgroundColor: t.c.brand }]}>
              <Glyph size={20} color={focused ? '#fff' : t.c.ink3} />
            </View>
            <Text variant="meta" style={{ color: focused ? t.c.ground : t.c.ink3 }} weight={focused ? 'semibold' : 'regular'}>
              {tab.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', paddingTop: 8 },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 52 },
  pill: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
