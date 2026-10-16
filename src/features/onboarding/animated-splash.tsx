import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/theme';
import { BrandMark } from '@/ui/brand-mark';
import { Text } from '@/ui';

/**
 * Continues the native splash (same mark, same ground) into a short brand moment:
 * the mark settles with a soft scale, the wordmark fades in, then the overlay fades away.
 */
export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const word = useSharedValue(0);
  const overlay = useSharedValue(1);

  useEffect(() => {
    if (!ready) return;
    if (reduced) {
      overlay.set(
        withTiming(0, { duration: 200 }, (done) => {
          if (done) scheduleOnRN(onDone);
        }),
      );
      return;
    }
    scale.set(withSequence(withTiming(0.9, { duration: 180 }), withTiming(1.06, { duration: 260, easing: Easing.out(Easing.back(2)) })));
    word.set(withDelay(220, withTiming(1, { duration: 320 })));
    overlay.set(
      withDelay(
        900,
        withTiming(0, { duration: 320 }, (done) => {
          if (done) scheduleOnRN(onDone);
        }),
      ),
    );
  }, [ready, reduced, scale, word, overlay, onDone]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 8 }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));

  return (
    <Animated.View pointerEvents={ready ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: t.c.ground }, overlayStyle]}>
      <Animated.View style={markStyle}>
        <BrandMark size={96} />
      </Animated.View>
      <Animated.View style={[styles.word, wordStyle]}>
        <Text variant="page" color="brand">
          براندك
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  word: { marginTop: 18 },
});
