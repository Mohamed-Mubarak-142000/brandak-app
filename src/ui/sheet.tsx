import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Text } from './text';

/**
 * Bottom sheet: slides up (transform only), dismisses on backdrop tap, swipe-down or the
 * Android back button (Modal onRequestClose).
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(open);
  const y = useSharedValue(600);
  const fade = useSharedValue(0);

  // Mount as soon as it opens (state adjusted during render); unmount after the exit animation.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      y.set(withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }));
      fade.set(withTiming(1, { duration: 220 }));
    } else {
      fade.set(withTiming(0, { duration: 180 }));
      y.set(
        withTiming(600, { duration: 220 }, (done) => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [open, y, fade]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      y.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) scheduleOnRN(onClose);
      else y.set(withTiming(0, { duration: 180 }));
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!mounted) return null;
  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent onRequestClose={onClose} animationType="none">
      <GestureHandlerRootView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.c.overlay }, backdropStyle]}>
            <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="إغلاق" accessibilityRole="button" />
          </Animated.View>
          <View style={styles.flex} pointerEvents="box-none" />
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              { backgroundColor: t.c.surface, paddingBottom: insets.bottom + 12, borderTopStartRadius: 24, borderTopEndRadius: 24 },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.handleZone}>
                <View style={[styles.handle, { backgroundColor: t.c.lineStrong }]} />
                {title && (
                  <Text variant="section" style={styles.title} accessibilityRole="header">
                    {title}
                  </Text>
                )}
              </View>
            </GestureDetector>
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" bounces={false}>
              {children}
            </ScrollView>
            {footer && <View style={styles.footer}>{footer}</View>}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { maxHeight: '88%' },
  handleZone: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 4 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
  title: { marginBottom: 4 },
  body: { paddingHorizontal: 20, paddingVertical: 8, gap: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
});
