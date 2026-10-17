import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories } from '@/api/queries';
import { haptic } from '@/lib/haptics';
import { PREF, prefs } from '@/lib/storage';
import { useTheme } from '@/theme';
import { Button, Chip, Skeleton, Tap, Text } from '@/ui';

/** Optional step after the slides: pick interests to order the home feed. Stored on-device. */
export default function Interests() {
  const t = useTheme();
  const router = useRouter();
  // then=register: the buyer chose to make an account on the welcome screen.
  const { then } = useLocalSearchParams<{ then?: 'register' }>();
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const [picked, setPicked] = useState<string[]>(() => prefs.get<string[]>(PREF.interests, []));

  const toggle = (id: string) => {
    haptic.tap();
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const done = (save: boolean) => {
    prefs.set(PREF.onboardingDone, true);
    if (save) prefs.set(PREF.interests, picked);
    router.replace('/(tabs)');
    if (then === 'register') router.push('/(auth)/register');
  };

  const roots = (categories.data ?? []).filter((c) => c.isActive && !c.parentId);

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.head}>
        <Text variant="ui" color="accent" weight="semibold">
          خطوة أخيرة · اختياري
        </Text>
        <Text variant="page">بتحب تتسوّق إيه؟</Text>
        <Text variant="body" color="ink2">
          اختار اهتماماتك وهنرتّب لك الرئيسية على ذوقك. تقدر تغيّرها بعدين.
        </Text>
      </View>

      <View style={styles.grid}>
        {categories.isLoading
          ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} width={90 + (i % 3) * 24} height={40} radius={20} />)
          : roots.map((c, i) => (
              <Animated.View key={c._id} entering={FadeInDown.delay(i * 40).duration(260)}>
                <Chip label={c.nameAr} selected={picked.includes(c._id)} icon={picked.includes(c._id) ? Check : undefined} onPress={() => toggle(c._id)} />
              </Animated.View>
            ))}
      </View>

      <View style={styles.flex} />
      <View style={styles.actions}>
        <Button label={picked.length ? `يلا بينا (${picked.length})` : 'يلا بينا'} onPress={() => done(true)} />
        <Tap onPress={() => done(false)} pressScale={1} style={styles.skip}>
          <Text variant="ui" color="ink2">
            تخطي الخطوة دي
          </Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { paddingHorizontal: 20, gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, paddingTop: 28 },
  actions: { paddingHorizontal: 20, gap: 4 },
  skip: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
