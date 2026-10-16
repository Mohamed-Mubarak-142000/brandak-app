import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { I18nManager, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { SLIDES, type Slide } from '@/features/onboarding/slides';
import { haptic } from '@/lib/haptics';
import { PREF, prefs } from '@/lib/storage';
import { useTheme } from '@/theme';
import { BrandMark } from '@/ui/brand-mark';
import { Button, Illustration, Tap, Text } from '@/ui';

const LAST = SLIDES.length - 1;
// Reading direction: in RTL the next slide waits on the left, so content moves right to reveal it.
const DIR = I18nManager.isRTL ? -1 : 1;
const SPRING = { damping: 20, stiffness: 180, mass: 0.9 };

export default function Onboarding() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const start = useSharedValue(0);
  const [index, setIndex] = useState(0);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (now, prev) => {
      if (prev !== null && now !== prev) scheduleOnRN(setIndex, now);
    },
  );

  const goTo = (i: number) => {
    progress.set(reduced ? withTiming(i, { duration: 1 }) : withSpring(i, SPRING));
    haptic.tap();
  };

  const finish = (to: 'shop' | 'login') => {
    prefs.set(PREF.onboardingDone, true);
    if (to === 'login') {
      router.replace('/(tabs)');
      router.push('/(auth)/login');
    } else {
      router.replace('/onboarding/interests');
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onBegin(() => {
      start.set(progress.value);
    })
    .onUpdate((e) => {
      const raw = start.value + (e.translationX * DIR * -1) / width;
      // Rubber-band past the first/last slide.
      progress.set(raw < 0 ? raw * 0.25 : raw > LAST ? LAST + (raw - LAST) * 0.25 : raw);
    })
    .onEnd((e) => {
      const v = (e.velocityX * DIR * -1) / width;
      let target = Math.round(progress.value + Math.max(-0.5, Math.min(0.5, v * 0.25)));
      target = Math.max(0, Math.min(LAST, target));
      progress.set(withSpring(target, SPRING));
      if (target !== Math.round(start.value)) scheduleOnRN(haptic.tap);
    });

  const isLast = index === LAST;

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.top}>
        <View style={styles.brandRow}>
          <BrandMark size={26} />
          <Text variant="section" color="brand">
            براندك
          </Text>
        </View>
        {!isLast && (
          <Tap onPress={() => goTo(LAST)} hitSlop={12} pressScale={1} accessibilityLabel="تخطي المقدمة">
            <Text variant="ui" color="ink2">
              تخطي
            </Text>
          </Tap>
        )}
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.flex} accessibilityRole="adjustable" accessibilityLabel={`شريحة ${index + 1} من ${SLIDES.length}`}>
          {SLIDES.map((slide, i) => (
            <SlideView key={slide.art} slide={slide} i={i} progress={progress} width={width} />
          ))}
        </View>
      </GestureDetector>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <Dot key={s.art} i={i} progress={progress} />
          ))}
        </View>
        {isLast ? (
          <View style={styles.actions}>
            <Button label="ابدأ التسوق" iconEnd={ArrowLeft} onPress={() => finish('shop')} />
            <Tap onPress={() => finish('login')} pressScale={1} style={styles.login} accessibilityLabel="عندك حساب؟ سجّل دخول">
              <Text variant="ui" color="ink2">
                عندك حساب؟{' '}
                <Text variant="ui" weight="bold" color="accent">
                  سجّل دخول
                </Text>
              </Text>
            </Tap>
          </View>
        ) : (
          <View style={styles.actions}>
            <Button label="التالي" iconEnd={ArrowLeft} onPress={() => goTo(index + 1)} />
            <View style={styles.login} />
          </View>
        )}
      </View>
    </View>
  );
}

function SlideView({ slide, i, progress, width }: { slide: Slide; i: number; progress: SharedValue<number>; width: number }) {
  const page = useAnimatedStyle(() => ({
    transform: [{ translateX: (i - progress.value) * width * DIR }],
  }));
  // Parallax: the art travels slower than the page and lifts slightly as it centres.
  const art = useAnimatedStyle(() => {
    const d = i - progress.value;
    return {
      opacity: interpolate(Math.abs(d), [0, 0.8], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: -d * width * DIR * 0.45 },
        { scale: interpolate(Math.abs(d), [0, 1], [1, 0.82], Extrapolation.CLAMP) },
        { rotate: `${d * -8}deg` },
      ],
    };
  });
  const copy = useAnimatedStyle(() => {
    const d = Math.abs(i - progress.value);
    return {
      opacity: interpolate(d, [0, 0.6], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(d, [0, 1], [0, 24], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.slide, { width }, page]} accessibilityElementsHidden={false}>
      <Animated.View style={[styles.art, art]}>
        <Illustration name={slide.art} size={Math.min(300, width * 0.78)} />
      </Animated.View>
      <Animated.View style={[styles.copy, copy]}>
        <Text variant="ui" color="accent" weight="semibold" align="center">
          {slide.eyebrow}
        </Text>
        <Text variant="page" align="center" style={styles.title}>
          {slide.title}
        </Text>
        <Text variant="body" color="ink2" align="center" style={styles.body}>
          {slide.body}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function Dot({ i, progress }: { i: number; progress: SharedValue<number> }) {
  const t = useTheme();
  const style = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(progress.value - i));
    return {
      width: interpolate(d, [0, 1], [28, 8]),
      opacity: interpolate(d, [0, 1], [1, 0.35]),
    };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: t.c.brand }, style]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { height: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  art: { flex: 1.2, justifyContent: 'flex-end', paddingBottom: 12 },
  copy: { flex: 1, alignItems: 'center', gap: 8, paddingTop: 8, maxWidth: 420 },
  title: { marginTop: 2 },
  body: { marginTop: 4 },
  bottom: { paddingHorizontal: 20, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  actions: { gap: 6 },
  login: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
