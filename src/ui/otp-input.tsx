import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { Text } from './text';

/**
 * Six-box code input backed by one hidden TextInput, so paste and SMS autofill
 * (`textContentType="oneTimeCode"` / `autoComplete="sms-otp"`) fill every box at once.
 * Boxes are laid out left-to-right: codes are read as numbers, not Arabic text.
 */
export function OtpInput({ value, onChange, error, length = 6 }: { value: string; onChange: (v: string) => void; error?: boolean; length?: number }) {
  const t = useTheme();
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(true);

  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="كود التأكيد" accessibilityHint="اكتب الكود المكوّن من 6 أرقام">
      <View style={styles.row}>
        {Array.from({ length }, (_, i) => {
          const active = focused && i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={[
                styles.box,
                {
                  borderColor: error ? t.c.danger : active ? t.c.brand : value[i] ? t.c.lineStrong : t.c.line,
                  borderWidth: active || error ? 2 : 1,
                  backgroundColor: value[i] ? t.c.surface : t.c.sunken,
                },
              ]}
            >
              <Text variant="page" style={styles.digit}>
                {value[i] ?? ''}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(latinDigits(v).replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', direction: 'ltr', justifyContent: 'center', gap: 8 },
  box: { width: 48, height: 58, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  digit: { fontFamily: 'IBMPlexSansArabic_600SemiBold' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
