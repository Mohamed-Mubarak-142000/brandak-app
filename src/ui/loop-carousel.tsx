import { useEffect, useState, type ReactNode } from 'react';
import { I18nManager, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/theme';

const DIR = I18nManager.isRTL ? -1 : 1;
const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Infinite, auto-playing carousel built on transforms (not a ScrollView), so it behaves the same
 * in RTL on Android and iOS. Slots are recycled: only the visible items plus one on each side
 * are rendered, and the data index wraps around forever.
 *
 * - `itemWidth` + `gap` define one step; several items can be visible at once (tiles).
 * - Autoplay pauses while the user drags and respects "reduce motion".
 */
export function LoopCarousel<T>({
  data,
  itemWidth,
  height,
  gap = 0,
  autoplayMs = 3500,
  renderItem,
  keyOf,
  dots,
  inset = 0,
}: {
  data: T[];
  itemWidth: number;
  height: number;
  gap?: number;
  autoplayMs?: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyOf: (item: T) => string;
  /** Page dots under the carousel (for one-item-per-page banners). */
  dots?: boolean;
  /** Leading padding before the first visible item. */
  inset?: number;
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [base, setBase] = useState(0);
  const progress = useSharedValue(0);
  const start = useSharedValue(0);
  const dragging = useSharedValue(false);
  const step = itemWidth + gap;
  const n = data.length;

  useAnimatedReaction(
    () => Math.floor(progress.value),
    (now, prev) => {
      if (now !== prev) scheduleOnRN(setBase, now);
    },
  );

  // Autoplay: advance one step every autoplayMs unless dragging.
  useEffect(() => {
    if (n < 2 || reduced || !autoplayMs) return;
    const id = setInterval(() => {
      if (dragging.value) return;
      progress.set(withTiming(Math.round(progress.value) + 1, { duration: 550, easing: Easing.out(Easing.cubic) }));
    }, autoplayMs);
    return () => clearInterval(id);
  }, [n, reduced, autoplayMs, progress, dragging]);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      dragging.set(true);
      start.set(progress.value);
    })
    .onUpdate((e) => {
      progress.set(start.value - (e.translationX * DIR) / step);
    })
    .onFinalize((e) => {
      const fling = Math.max(-1, Math.min(1, (-e.velocityX * DIR) / 1200));
      progress.set(withTiming(Math.round(progress.value + fling * 0.6), { duration: 320, easing: Easing.out(Easing.cubic) }));
      dragging.set(false);
    });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  if (!n) return null;

  // Enough slots to cover the viewport, plus one before and one after.
  const visible = width ? Math.ceil((width - inset) / step) + 1 : 1;
  const slots = Array.from({ length: visible + 2 }, (_, i) => base - 1 + i);

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View style={[styles.viewport, { height }]} onLayout={onLayout}>
          {width > 0 &&
            slots.map((slot) => {
              const i = mod(slot, n);
              return (
                <Slot key={`${slot}-${keyOf(data[i])}`} slot={slot} progress={progress} step={step} inset={inset} width={itemWidth} height={height}>
                  {renderItem(data[i], i)}
                </Slot>
              );
            })}
        </View>
      </GestureDetector>
      {dots && n > 1 && <Dots n={n} progress={progress} color={t.c.brand} muted={t.c.lineStrong} />}
    </View>
  );
}

function Slot({
  slot,
  progress,
  step,
  inset,
  width,
  height,
  children,
}: {
  slot: number;
  progress: SharedValue<number>;
  step: number;
  inset: number;
  width: number;
  height: number;
  children: ReactNode;
}) {
  // Absolute `start` respects RTL; transforms are physical, so flip them for RTL.
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (inset + (slot - progress.value) * step) * DIR }] }));
  return <Animated.View style={[styles.slot, { width, height }, style]}>{children}</Animated.View>;
}

function Dots({ n, progress, color, muted }: { n: number; progress: SharedValue<number>; color: string; muted: string }) {
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: n }, (_, i) => (
        <Dot key={i} i={i} n={n} progress={progress} color={color} muted={muted} />
      ))}
    </View>
  );
}

function Dot({ i, n, progress, color, muted }: { i: number; n: number; progress: SharedValue<number>; color: string; muted: string }) {
  const style = useAnimatedStyle(() => {
    const active = (((Math.round(progress.value) % n) + n) % n) === i;
    return { width: withTiming(active ? 20 : 7, { duration: 220 }), backgroundColor: active ? color : muted };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  viewport: { overflow: 'hidden' },
  slot: { position: 'absolute', top: 0, start: 0 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { height: 7, borderRadius: 4 },
});
