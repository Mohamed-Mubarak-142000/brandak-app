import { StyleSheet, Switch, View } from 'react-native';

import type { SpecDef } from '@/api/types';
import { useTheme } from '@/theme';
import { Select, Text, TextField } from '@/ui';

/** Answers to the template fields, as typed (numbers are converted on save). */
export type SpecDraft = Record<string, string | boolean>;

/** The category's own fields (brand, warranty, material...), one input per type. */
export function SpecsFields({ specs, values, onChange, errors }: { specs: SpecDef[]; values: SpecDraft; onChange: (v: SpecDraft) => void; errors: Record<string, string> }) {
  const t = useTheme();
  const set = (key: string, v: string | boolean) => onChange({ ...values, [key]: v });
  if (!specs.length) return null;
  return (
    <View style={styles.gap}>
      <Text variant="bodyStrong">المواصفات</Text>
      <Text variant="meta" color="ink3">
        بتظهر للعميل في صفحة المنتج، واللي عليها فلتر بيدوّر بيها.
      </Text>
      {specs.map((s) => {
        const label = s.unit && s.type === 'number' ? `${s.labelAr} (${s.unit})` : s.labelAr;
        const v = values[s.key];
        switch (s.type) {
          case 'boolean':
            return (
              <View key={s.key} style={[styles.toggle, { borderColor: t.c.line, borderRadius: t.radius.md }]}>
                <Text variant="ui" style={styles.flex}>
                  {s.labelAr}
                </Text>
                <Switch value={v === true} onValueChange={(on) => set(s.key, on)} trackColor={{ true: t.c.accent, false: t.c.lineStrong }} thumbColor="#fff" accessibilityLabel={s.labelAr} />
              </View>
            );
          case 'select':
            return (
              <Select
                key={s.key}
                label={s.required ? label : `${label} (اختياري)`}
                value={typeof v === 'string' && v ? v : null}
                options={(s.options ?? []).map((o) => ({ value: o, label: o }))}
                onChange={(o) => set(s.key, o)}
                error={errors[s.key]}
              />
            );
          default:
            return (
              <TextField
                key={s.key}
                label={label}
                optional={!s.required}
                value={typeof v === 'string' ? v : ''}
                onChangeText={(x) => set(s.key, x)}
                keyboardType={s.type === 'number' ? 'decimal-pad' : 'default'}
                ltr={s.type === 'number'}
                maxLength={100}
                error={errors[s.key]}
              />
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
});
