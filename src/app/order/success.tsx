import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMoney } from '@/lib/format';
import { useTheme } from '@/theme';
import { Button, Card, Illustration, Text } from '@/ui';

export default function OrderSuccess() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { id, number, brand, total } = useLocalSearchParams<{ id: string; number: string; brand?: string; total?: string }>();
  const scale = useSharedValue(reduced ? 1 : 0.4);

  useEffect(() => {
    if (!reduced) scale.set(withDelay(80, withSpring(1, { damping: 9, stiffness: 160 })));
  }, [reduced, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.center}>
        <Animated.View style={pop}>
          <Illustration name="success" size={200} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.copy}>
          <Text variant="page" align="center" accessibilityRole="header">
            طلبك اتبعت بنجاح!
          </Text>
          <Text variant="body" color="ink2" align="center">
            {brand ? `${brand} هيأكد الطلب قريب` : 'البراند هيأكد الطلب قريب'}، وهنبعتلك إشعار مع كل خطوة.
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(400).duration(300)} style={styles.full}>
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text variant="ui" color="ink2">
                رقم الطلب
              </Text>
              <Text variant="bodyStrong" selectable>
                #{number}
              </Text>
            </View>
            {total && (
              <View style={styles.row}>
                <Text variant="ui" color="ink2">
                  هتدفع عند الاستلام
                </Text>
                <Text variant="bodyStrong">{formatMoney(Number(total))}</Text>
              </View>
            )}
          </Card>
        </Animated.View>
      </View>
      <View style={styles.actions}>
        <Button label="تتبّع الطلب" onPress={() => router.replace({ pathname: '/order/[id]', params: { id } })} />
        <Button label="كمّل تسوق" variant="secondary" onPress={() => router.replace('/(tabs)')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 24, gap: 16 },
  copy: { gap: 8, alignItems: 'center' },
  full: { alignSelf: 'stretch' },
  card: { gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { paddingHorizontal: 20, gap: 10 },
});
