import type { ComponentRef, Ref } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TapProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale on press (0.97 default). Set 1 to disable. */
  pressScale?: number;
  ref?: Ref<ComponentRef<typeof Pressable>>;
}

/** Pressable with a subtle press-in scale (transform only, 150ms) that respects reduced motion. */
export function Tap({ style, pressScale = 0.97, onPressIn, onPressOut, ref, ...rest }: TapProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      {...rest}
      onPressIn={(e) => {
        if (!reduced && pressScale !== 1) scale.set(withTiming(pressScale, { duration: 120 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, { duration: 150 }));
        onPressOut?.(e);
      }}
      style={[style, animated]}
    />
  );
}
