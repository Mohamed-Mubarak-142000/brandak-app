import { RotateCw, WifiOff } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ApiError } from '@/api/client';
import { useTheme } from '@/theme';
import { Button } from './button';
import { Illustration, type IllustrationName } from './illustrations';
import { Text } from './text';

/** Pulsing placeholder that reserves the exact space of the content it stands for. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    opacity.set(withRepeat(withSequence(withTiming(0.45, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
  }, [opacity, reduced]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: t.c.skeleton }, animated, style]}
    />
  );
}

export function EmptyState({
  art = 'empty',
  title,
  body,
  action,
  onAction,
  children,
}: {
  art?: IllustrationName;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <Illustration name={art} size={180} />
      <Text variant="section" align="center">
        {title}
      </Text>
      {body && (
        <Text variant="body" color="ink2" align="center" style={styles.body}>
          {body}
        </Text>
      )}
      {action && <Button label={action} onPress={onAction} block={false} style={styles.cta} />}
      {children}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = error instanceof ApiError && error.code === 'NETWORK';
  const message = error instanceof ApiError ? error.message : 'حدث خطأ غير متوقع';
  return (
    <View style={styles.center}>
      <Illustration name={offline ? 'offline' : 'error'} size={160} />
      <Text variant="section" align="center">
        {offline ? 'مفيش إنترنت' : 'تعذّر تحميل البيانات'}
      </Text>
      <Text variant="body" color="ink2" align="center" style={styles.body}>
        {message}
      </Text>
      {onRetry && (
        <Button label="إعادة المحاولة" icon={offline ? WifiOff : RotateCw} variant="secondary" onPress={onRetry} block={false} style={styles.cta} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  body: { maxWidth: 320 },
  cta: { marginTop: 12, minWidth: 180, alignSelf: 'center' },
});
