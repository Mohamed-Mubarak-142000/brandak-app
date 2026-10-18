import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Button, Icon, Sheet, Tap, Text } from '@/ui';

export interface StatusOption<T extends string> {
  value: T | undefined;
  label: string;
}

/**
 * Bottom sheet with one status to pick, same pattern as the customer orders filter: the choice
 * is a draft until "عرض" applies it.
 */
export function StatusFilterSheet<T extends string>({
  open,
  onClose,
  title,
  options,
  value,
  onApply,
  applyLabel = 'عرض النتائج',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: StatusOption<T>[];
  value: T | undefined;
  onApply: (v: T | undefined) => void;
  applyLabel?: string;
}) {
  const t = useTheme();
  const [draft, setDraft] = useState<T | undefined>(value);
  // Restart from the applied value every time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(value);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <View style={styles.footer}>
          <Button
            label={applyLabel}
            style={styles.flex}
            onPress={() => {
              onApply(draft);
              onClose();
            }}
          />
          <Button label="مسح" variant="secondary" block={false} onPress={() => setDraft(undefined)} />
        </View>
      }
    >
      <View accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = draft === o.value;
          return (
            <Tap
              key={o.value ?? 'all'}
              onPress={() => {
                haptic.tap();
                setDraft(o.value);
              }}
              pressScale={1}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[styles.row, { borderBottomColor: t.c.line }]}
            >
              <Text variant="body" weight={on ? 'semibold' : 'regular'} color={on ? 'accent' : 'ink'} style={styles.flex}>
                {o.label}
              </Text>
              {on && <Icon as={Check} color="accent" size={20} />}
            </Tap>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
});
