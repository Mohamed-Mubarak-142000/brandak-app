import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Icon, Text } from '@/ui';

/** Feeds connectivity into TanStack Query (pauses/resumes queries) and shows a small banner. */
export function OfflineBanner() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        const online = state.isConnected !== false && state.isInternetReachable !== false;
        onlineManager.setOnline(online);
        setOffline(!online);
      }),
    [],
  );

  if (!offline) return null;
  return (
    <Animated.View
      entering={SlideInDown.duration(220)}
      exiting={SlideOutDown.duration(180)}
      accessibilityLiveRegion="polite"
      style={[styles.bar, { bottom: insets.bottom + 80, backgroundColor: t.c.ink }]}
    >
      <Icon as={WifiOff} size={18} color="ground" />
      <Text variant="ui" color="ground">
        مفيش اتصال بالإنترنت — هنكمل أول ما يرجع
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    zIndex: 40,
  },
});
