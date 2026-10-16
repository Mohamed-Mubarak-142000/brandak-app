import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { House, Package, Search, ShoppingBag, UserRound, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCarts } from '@/api/queries';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Tap, Text } from '@/ui';

const TABS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'index', label: 'الرئيسية', icon: House },
  { name: 'explore', label: 'استكشف', icon: Search },
  { name: 'cart', label: 'السلة', icon: ShoppingBag },
  { name: 'orders', label: 'طلباتي', icon: Package },
  { name: 'account', label: 'حسابي', icon: UserRound },
];

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}

function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const carts = useCarts();
  const cartCount = (carts.data ?? []).reduce((n, c) => n + c.itemsCount, 0);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: t.c.surface, borderTopColor: t.c.line }]} accessibilityRole="tabbar">
      {state.routes.map((route, i) => {
        const tab = TABS.find((x) => x.name === route.name);
        if (!tab) return null;
        const focused = state.index === i;
        const badge = tab.name === 'cart' ? cartCount : 0;
        return (
          <TabItem
            key={route.key}
            tab={tab}
            focused={focused}
            badge={badge}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                haptic.tap();
                navigateToTab(route.key);
              }
            }}
          />
        );
      })}
    </View>
  );
}

function TabItem({ tab, focused, badge, onPress }: { tab: (typeof TABS)[number]; focused: boolean; badge: number; onPress: () => void }) {
  const t = useTheme();
  const pill = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: 200 }),
    transform: [{ scaleX: withTiming(focused ? 1 : 0.6, { duration: 220 }) }],
  }));
  const Glyph = tab.icon;
  return (
    <Tap
      onPress={onPress}
      style={styles.item}
      pressScale={0.92}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={badge ? `${tab.label}، ${badge} منتج` : tab.label}
    >
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, { backgroundColor: t.c.accentSoft }, pill]} />
        <Glyph size={22} color={focused ? t.c.accent : t.c.ink3} strokeWidth={focused ? 2.3 : 1.9} />
        {badge > 0 && (
          <View style={[styles.badge, { backgroundColor: t.c.brand, borderColor: t.c.surface }]}>
            <Text variant="meta" color="onAccent" weight="bold" style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>
      <Text variant="meta" weight={focused ? 'semibold' : 'regular'} color={focused ? 'accent' : 'ink3'}>
        {tab.label}
      </Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 52 },
  iconWrap: { width: 56, height: 30, alignItems: 'center', justifyContent: 'center' },
  pill: { ...StyleSheet.absoluteFill, borderRadius: 15 },
  badge: {
    position: 'absolute',
    top: -4,
    end: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 13 },
});
