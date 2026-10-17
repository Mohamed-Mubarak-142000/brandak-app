import { Check, ChevronDown, X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Button } from './button';
import { Icon } from './icon';
import { Tap } from './pressable';
import { Sheet } from './sheet';
import { Text } from './text';
import type { SelectOption } from './select';

/**
 * Multi-select dropdown: a field that opens a bottom sheet of checkable options. The picks are
 * shown as removable chips under the field. `max` caps the selection (e.g. 5 categories).
 */
export function MultiSelect<T extends string>({
  label,
  placeholder = 'اختار...',
  value,
  options,
  onChange,
  max,
  error,
  hint,
  sheetTitle,
  loading,
}: {
  label: string;
  placeholder?: string;
  value: T[];
  options: SelectOption<T>[];
  onChange: (value: T[]) => void;
  max?: number;
  error?: string;
  hint?: string;
  sheetTitle?: string;
  loading?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const picked = options.filter((o) => value.includes(o.value));
  const full = max != null && value.length >= max;

  const toggle = (v: T) => {
    haptic.tap();
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else if (!full) onChange([...value, v]);
  };

  const summary = picked.length ? picked.map((p) => p.label).join('، ') : placeholder;

  return (
    <View style={styles.wrap}>
      <Text variant="ui" color="ink2">
        {label}
        {max != null && (
          <Text variant="meta" color="ink3">
            {`  (${value.length}/${max})`}
          </Text>
        )}
      </Text>
      <Tap
        onPress={() => setOpen(true)}
        pressScale={1}
        disabled={loading}
        accessibilityRole="combobox"
        accessibilityLabel={`${label}: ${picked.length ? summary : 'مفيش اختيار'}`}
        accessibilityHint={error}
        style={[
          styles.box,
          { borderColor: error ? t.c.danger : t.c.lineStrong, borderWidth: error ? 1.5 : 1, backgroundColor: t.c.surface, borderRadius: t.radius.md },
        ]}
      >
        <Text variant="body" color={picked.length ? 'ink' : 'ink3'} numberOfLines={1} style={styles.flex}>
          {loading ? 'جاري التحميل...' : summary}
        </Text>
        <Icon as={ChevronDown} size={20} color="ink3" />
      </Tap>
      {picked.length > 0 && (
        <View style={styles.chips}>
          {picked.map((p) => (
            <Tap
              key={p.value}
              onPress={() => toggle(p.value)}
              pressScale={1}
              hitSlop={4}
              accessibilityLabel={`إزالة ${p.label}`}
              style={[styles.chip, { backgroundColor: t.c.accentSoft, borderColor: t.c.brand }]}
            >
              <Text variant="meta" weight="semibold" color="accent">
                {p.label}
              </Text>
              <Icon as={X} size={13} color="accent" />
            </Tap>
          ))}
        </View>
      )}
      {error ? (
        <Text variant="meta" color="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta" color="ink3">
          {hint}
        </Text>
      ) : null}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? label}
        footer={<Button label={value.length ? `تم (${value.length})` : 'تم'} onPress={() => setOpen(false)} />}
      >
        {max != null && (
          <Text variant="meta" color={full ? 'warning' : 'ink3'}>
            {full ? `وصلت للحد الأقصى (${max})` : `تقدر تختار لحد ${max}`}
          </Text>
        )}
        {options.map((o) => {
          const on = value.includes(o.value);
          const disabled = !on && full;
          return (
            <Tap
              key={o.value}
              pressScale={1}
              disabled={disabled}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled }}
              onPress={() => toggle(o.value)}
              style={[
                styles.option,
                { borderColor: on ? t.c.brand : t.c.line, backgroundColor: on ? t.c.accentSoft : t.c.surface, borderRadius: t.radius.md, opacity: disabled ? 0.45 : 1 },
              ]}
            >
              {o.icon && <Icon as={o.icon} size={20} color={on ? 'accent' : 'ink2'} />}
              <Text variant="body" color={on ? 'accent' : 'ink'} weight={on ? 'semibold' : 'regular'} style={styles.flex}>
                {o.label}
              </Text>
              <View style={[styles.box2, { borderColor: on ? t.c.brand : t.c.lineStrong, backgroundColor: on ? t.c.brand : 'transparent' }]}>
                {on && <Check size={14} color="#fff" strokeWidth={3} />}
              </View>
            </Tap>
          );
        })}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: 6 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 12, borderWidth: 1 },
  box2: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
