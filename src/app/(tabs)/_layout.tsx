import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { House, Package, Search, ShoppingBag, UserRound } from 'lucide-react-native';

import { useCarts } from '@/api/queries';
import { TabBar, type TabSpec } from '@/ui';

const TABS: TabSpec[] = [
  { name: 'index', label: 'الرئيسية', icon: House },
  { name: 'explore', label: 'استكشف', icon: Search },
  { name: 'cart', label: 'السلة', icon: ShoppingBag },
  { name: 'orders', label: 'طلباتي', icon: Package },
  { name: 'account', label: 'حسابي', icon: UserRound },
];

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <CustomerTabBar {...props} />}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}

function CustomerTabBar(props: BottomTabBarProps) {
  const carts = useCarts();
  const cartCount = (carts.data ?? []).reduce((n, c) => n + c.itemsCount, 0);
  return <TabBar {...props} tabs={TABS} badges={{ cart: cartCount }} badgeLabel={(label, n) => `${label}، ${n} منتج`} />;
}
