import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Tap, Text } from '@/ui';

/** Header used by every desk tab: "back to shopping", title, optional action. */
export function DeskHeader({ title, subtitle, end }: { title: string; subtitle?: string; end?: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Tap onPress={() => router.dismissTo('/(tabs)/account')} pressScale={1} style={styles.back} accessibilityLabel="رجوع للتسوق">
        <Icon as={ArrowRight} size={18} color="ink3" />
        <Text variant="meta" color="ink3">
          رجوع للتسوق
        </Text>
      </Tap>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="page" accessibilityRole="header">
            {title}
          </Text>
          {subtitle && (
            <Text variant="ui" color="ink3">
              {subtitle}
            </Text>
          )}
        </View>
        {end}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
