import { type BottomTabBarProps } from 'expo-router/tabs';
import { type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { Tap } from './pressable';
import { Text } from './text';

export type TabSpec = { name: string; label: string; icon: LucideIcon };

type TabBarProps = BottomTabBarProps & {
  tabs: readonly TabSpec[];
  /** Count shown on a tab's icon, keyed by route name. */
  badges?: Partial<Record<string, number>>;
  /** Screen-reader label for a tab carrying a badge. */
  badgeLabel?: (label: string, count: number) => string;
};

/** The app's single bottom tab bar look (customer tabs and seller desk). */
export function TabBar({ state, emitter, navigateToTab, tabs, badges, badgeLabel }: TabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: t.c.surface, borderTopColor: t.c.line }]} accessibilityRole="tabbar">
      {state.routes.map((route, i) => {
        const tab = tabs.find((x) => x.name === route.name);
        if (!tab) return null;
        const focused = state.index === i;
        const badge = badges?.[tab.name] ?? 0;
        return (
          <TabItem
            key={route.key}
            tab={tab}
            focused={focused}
            badge={badge}
            badgeLabel={badgeLabel}
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

function TabItem({
  tab,
  focused,
  badge,
  badgeLabel,
  onPress,
}: {
  tab: TabSpec;
  focused: boolean;
  badge: number;
  badgeLabel?: (label: string, count: number) => string;
  onPress: () => void;
}) {
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
      accessibilityLabel={badge ? (badgeLabel ? badgeLabel(tab.label, badge) : `${tab.label}، ${badge}`) : tab.label}
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
