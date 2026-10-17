import { useEffect } from 'react';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/theme';

/**
 * Presents the approved Dakakeen logo before the splash overlay fades away.
 */
export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
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
    overlay.set(
      withDelay(
        900,
        withTiming(0, { duration: 320 }, (done) => {
          if (done) scheduleOnRN(onDone);
        }),
      ),
    );
  }, [ready, reduced, scale, overlay, onDone]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));

  return (
    <Animated.View pointerEvents={ready ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: t.c.ground }, overlayStyle]}>
      <Animated.View style={markStyle}>
        <Image source={require('../../../assets/brand/dakakeen-logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="Dakakeen" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  logo: { width: 240, height: 240, borderRadius: 24 },
});
