import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/ui';

/** Header used by every desk tab: title, optional action. Store accounts don't shop. */
export function DeskHeader({ title, subtitle, end }: { title: string; subtitle?: string; end?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
