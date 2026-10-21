import { useRouter } from 'expo-router';
import { ChevronLeft, LogIn, ShoppingBag, Store, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { PREF, prefs } from '@/lib/storage';
import { useTheme } from '@/theme';
import { BrandMark } from '@/ui/brand-mark';
import { Icon, Tap, Text } from '@/ui';

/**
 * After the intro slides: who are you? Nothing here is required — "تصفح كضيف" goes straight in.
 * Buyers are never asked about stores; store owners go on to the open-a-store wizard after sign-up.
 */
export default function Welcome() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const go = (choice: 'buyer' | 'seller' | 'login' | 'guest') => {
    haptic.tap();
    prefs.set(PREF.onboardingDone, true);
    if (choice === 'buyer') router.replace({ pathname: '/onboarding/interests', params: { then: 'register' } });
    else if (choice === 'guest') router.replace('/onboarding/interests');
    else {
      router.replace('/(tabs)');
      if (choice === 'seller') router.push({ pathname: '/(auth)/register', params: { intent: 'seller' } });
      else router.push('/(auth)/login');
    }
  };

  const options: { key: 'buyer' | 'seller' | 'login'; icon: LucideIcon; title: string; body: string; primary?: boolean }[] = [
    { key: 'buyer', icon: ShoppingBag, title: 'أنا بتسوّق', body: 'حساب مشتري: اطلب من أي متجر، تابع طلباتك، واحفظ اللي عجبك.', primary: true },
    { key: 'seller', icon: Store, title: 'عندي متجر', body: 'معرض أو مخزن أو محل أو براند؟ افتح متجرك وابدأ تبيع.' },
    { key: 'login', icon: LogIn, title: 'عندي حساب', body: 'سجّل دخول وكمّل من مكان ما وقفت.' },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.top}>
        <View />
        <Tap onPress={() => go('guest')} hitSlop={12} pressScale={1} style={styles.skip} accessibilityLabel="تصفح كضيف من غير حساب">
          <Text variant="ui" color="ink2">
            تصفح كضيف
          </Text>
          <Icon as={ChevronLeft} size={16} color="ink2" />
        </Tap>
      </View>

      <Animated.View entering={FadeInDown.duration(320)} style={styles.head}>
        <BrandMark size={64} />
        <Text variant="page" align="center">
          أهلاً بيك في فاترينة
        </Text>
        <Text variant="body" color="ink2" align="center">
          كل المعارض والمخازن والمحلات والبراندات في مكان واحد. تحب تبدأ إزاي؟
        </Text>
      </Animated.View>

      <View style={styles.options}>
        {options.map((o, i) => (
          <Animated.View key={o.key} entering={FadeInDown.delay(120 + i * 80).duration(300)}>
            <Tap
              onPress={() => go(o.key)}
              pressScale={0.98}
              accessibilityLabel={`${o.title}. ${o.body}`}
              style={[
                styles.card,
                {
                  backgroundColor: o.primary ? t.c.accent : t.c.surface,
                  borderColor: o.primary ? t.c.accent : t.c.line,
                  borderRadius: t.radius.lg,
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: o.primary ? 'rgba(255,255,255,0.18)' : t.c.accentSoft }]}>
                <Icon as={o.icon} size={24} color={o.primary ? 'onAccent' : 'accent'} />
              </View>
              <View style={styles.flex}>
                <Text variant="bodyStrong" color={o.primary ? 'onAccent' : 'ink'}>
                  {o.title}
                </Text>
                <Text variant="meta" color={o.primary ? 'onAccent' : 'ink2'} style={o.primary && styles.soft}>
                  {o.body}
                </Text>
              </View>
              <Icon as={ChevronLeft} size={20} color={o.primary ? 'onAccent' : 'ink3'} />
            </Tap>
          </Animated.View>
        ))}
      </View>

      <Text variant="meta" color="ink3" align="center" style={styles.note}>
        مفيش حاجة إجبارية — تقدر تتصفح دلوقتي وتعمل حساب وقت ما تحب.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 44 },
  skip: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 44 },
  head: { alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingTop: 16 },
  options: { flex: 1, justifyContent: 'center', gap: 12, paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1, minHeight: 84 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  soft: { opacity: 0.9 },
  note: { paddingHorizontal: 24 },
});
