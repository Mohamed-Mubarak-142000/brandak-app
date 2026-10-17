import { Check, ChevronDown, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Icon } from './icon';
import { Tap } from './pressable';
import { Sheet } from './sheet';
import { Text } from './text';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

/**
 * Dropdown that looks like a TextField (label, placeholder, chevron) and opens a bottom sheet
 * of options — the mobile-friendly take on a <select>.
 */
export function Select<T extends string>({
  label,
  placeholder = 'اختار...',
  value,
  options,
  onChange,
  error,
  hint,
  sheetTitle,
}: {
  label: string;
  placeholder?: string;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  hint?: string;
  sheetTitle?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      <Text variant="ui" color="ink2">
        {label}
      </Text>
      <Tap
        onPress={() => setOpen(true)}
        pressScale={1}
        accessibilityRole="combobox"
        accessibilityLabel={`${label}: ${current?.label ?? placeholder}`}
        accessibilityHint={error}
        style={[
          styles.box,
          { borderColor: error ? t.c.danger : t.c.lineStrong, backgroundColor: t.c.surface, borderRadius: t.radius.md, borderWidth: error ? 1.5 : 1 },
        ]}
      >
        {current?.icon && <Icon as={current.icon} size={20} color="accent" />}
        <Text variant="body" color={current ? 'ink' : 'ink3'} style={styles.flex} numberOfLines={1}>
          {current?.label ?? placeholder}
        </Text>
        <Icon as={ChevronDown} size={20} color="ink3" />
      </Tap>
      {error ? (
        <Text variant="meta" color="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta" color="ink3">
          {hint}
        </Text>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title={sheetTitle ?? label}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Tap
              key={o.value}
              pressScale={1}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => {
                haptic.tap();
                onChange(o.value);
                setOpen(false);
              }}
              style={[styles.option, { borderColor: on ? t.c.brand : t.c.line, backgroundColor: on ? t.c.accentSoft : t.c.surface, borderRadius: t.radius.md }]}
            >
              {o.icon && (
                <View style={[styles.optionIcon, { backgroundColor: on ? t.c.surface : t.c.sunken }]}>
                  <Icon as={o.icon} size={22} color={on ? 'accent' : 'ink2'} />
                </View>
              )}
              <View style={styles.flex}>
                <Text variant="bodyStrong" color={on ? 'accent' : 'ink'}>
                  {o.label}
                </Text>
                {o.description && (
                  <Text variant="meta" color="ink2">
                    {o.description}
                  </Text>
                )}
              </View>
              {on && <Icon as={Check} color="accent" />}
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
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  optionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
