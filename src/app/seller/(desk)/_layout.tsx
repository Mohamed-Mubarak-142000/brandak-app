import { Redirect, Tabs, useSegments } from 'expo-router';
import { LayoutDashboard, Package, ShoppingCart, Store } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useMyBrand } from '@/api/queries';
import { useMe } from '@/auth/use-auth';
import { BrandStatusScreen } from '@/features/seller/brand-status';
import { useTheme } from '@/theme';
import { ErrorState, Skeleton, TabBar, type TabSpec } from '@/ui';

const TABS: TabSpec[] = [
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
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} tabs={TABS} />}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
