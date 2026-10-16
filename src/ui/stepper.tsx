import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Icon } from './icon';
import { Tap } from './pressable';
import { Text } from './text';

/** − qty + ; at 1 the minus becomes a remove button when `onRemove` is given. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  onRemove,
  disabled,
  compact,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  onRemove?: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const t = useTheme();
  const h = compact ? 36 : 44;
  const atMin = value <= min;
  return (
    <View
      style={[styles.row, { height: h, borderColor: t.c.lineStrong, backgroundColor: t.c.surface, opacity: disabled ? 0.5 : 1 }]}
      accessibilityRole="adjustable"
      accessibilityLabel={`الكمية ${value}`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && value < max) onChange(value + 1);
        if (e.nativeEvent.actionName === 'decrement' && value > min) onChange(value - 1);
      }}
    >
      <Tap
        disabled={disabled || value >= max}
        onPress={() => onChange(value + 1)}
        accessibilityLabel="زيادة الكمية"
        style={[styles.btn, { width: h, opacity: value >= max ? 0.35 : 1 }]}
      >
        <Icon as={Plus} size={18} />
      </Tap>
      <Text variant="bodyStrong" style={styles.value}>
        {value}
      </Text>
      <Tap
        disabled={disabled || (atMin && !onRemove)}
        onPress={() => (atMin ? onRemove?.() : onChange(value - 1))}
        accessibilityLabel={atMin && onRemove ? 'حذف' : 'تقليل الكمية'}
        style={[styles.btn, { width: h, opacity: atMin && !onRemove ? 0.35 : 1 }]}
      >
        <Icon as={atMin && onRemove ? Trash2 : Minus} size={18} color={atMin && onRemove ? 'danger' : 'ink'} />
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, alignSelf: 'flex-start' },
  btn: { height: '100%', alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 28, textAlign: 'center' },
});
