import { StyleSheet, View } from 'react-native';

import { passwordStrength } from '@/lib/validation';
import { useTheme } from '@/theme';
import { Text } from '@/ui';

const LABELS = ['', 'ضعيفة', 'مقبولة', 'كويسة', 'قوية'];

export function PasswordMeter({ value }: { value: string }) {
  const t = useTheme();
  if (!value) return null;
  const score = passwordStrength(value);
  const color = score <= 1 ? t.c.danger : score === 2 ? t.c.warning : t.c.success;
  return (
    <View style={styles.row} accessibilityLabel={`قوة كلمة السر: ${LABELS[score] || 'ضعيفة'}`}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i <= score ? color : t.c.line }]} />
        ))}
      </View>
      <Text variant="meta" style={{ color }}>
        {LABELS[score] || 'ضعيفة'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bars: { flex: 1, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
});
