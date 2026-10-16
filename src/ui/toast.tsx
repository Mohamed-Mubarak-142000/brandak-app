import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { useTheme } from '@/theme';
import { Icon } from './icon';
import { Tap } from './pressable';
import { Text } from './text';

type Tone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
  action?: { label: string; onPress: () => void };
}

const useToasts = create<{ current: ToastItem | null; show: (t: Omit<ToastItem, 'id'>) => void; hide: () => void }>((set) => ({
  current: null,
  show: (t) => set({ current: { ...t, id: Date.now() } }),
  hide: () => set({ current: null }),
}));

export const toast = {
  success: (message: string, action?: ToastItem['action']) => useToasts.getState().show({ message, tone: 'success', action }),
  error: (message: string) => useToasts.getState().show({ message, tone: 'error' }),
  info: (message: string) => useToasts.getState().show({ message, tone: 'info' }),
};

export function ToastHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { current, hide } = useToasts();

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(hide, current.action ? 4000 : 2800);
    return () => clearTimeout(timer);
  }, [current, hide]);

  if (!current) return null;
  const icon = current.tone === 'success' ? CircleCheck : current.tone === 'error' ? CircleAlert : Info;
  const color = current.tone === 'success' ? 'success' : current.tone === 'error' ? 'danger' : 'ink2';
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
      <Animated.View
        key={current.id}
        entering={FadeInUp.duration(220)}
        exiting={FadeOutUp.duration(160)}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.toast, { backgroundColor: t.c.surface, borderColor: t.c.line, shadowColor: t.c.shadow }]}
      >
        <Icon as={icon} color={color} size={22} />
        <Text variant="ui" style={styles.flex}>
          {current.message}
        </Text>
        {current.action && (
          <Tap
            hitSlop={10}
            pressScale={1}
            onPress={() => {
              current.action?.onPress();
              hide();
            }}
          >
            <Text variant="ui" weight="bold" color="accent">
              {current.action.label}
            </Text>
          </Tap>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', start: 16, end: 16, zIndex: 50, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  flex: { flex: 1 },
});
