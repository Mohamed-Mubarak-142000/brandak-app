import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { useState, type ComponentRef, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';
import { Icon } from './icon';
import { Tap } from './pressable';
import { Text } from './text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  password?: boolean;
  /** Numbers, emails, phones: keep them left-to-right even in an RTL form. */
  ltr?: boolean;
  optional?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

/** Labelled input; the error sits right under the field (ui-ux-pro-max: error-feedback). */
export function TextField({ label, error, hint, icon, password, ltr, optional, multiline, onFocus, onBlur, ref, ...rest }: TextFieldProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const border = error ? t.c.danger : focused ? t.c.brand : t.c.lineStrong;

  return (
    <View style={styles.wrap}>
      <Text variant="ui" color="ink2">
        {label}
        {optional && <Text variant="meta" color="ink3">{'  (اختياري)'}</Text>}
      </Text>
      <View
        style={[
          styles.box,
          {
            borderColor: border,
            borderWidth: focused || error ? 1.5 : 1,
            backgroundColor: t.c.surface,
            borderRadius: t.radius.md,
            minHeight: multiline ? 110 : 52,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        {icon && (
          <View style={multiline ? styles.iconTop : undefined}>
            <Icon as={icon} size={20} color="ink3" />
          </View>
        )}
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          secureTextEntry={password && hidden}
          placeholderTextColor={t.c.ink3}
          selectionColor={t.c.brand}
          accessibilityLabel={label}
          accessibilityHint={error}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            t.type.body,
            styles.input,
            {
              color: t.c.ink,
              writingDirection: ltr ? 'ltr' : 'rtl',
              paddingVertical: multiline ? 12 : 0,
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
        />
        {password && (
          <Tap
            onPress={() => setHidden((h) => !h)}
            accessibilityLabel={hidden ? 'إظهار كلمة السر' : 'إخفاء كلمة السر'}
            hitSlop={12}
            pressScale={1}
          >
            <Icon as={hidden ? Eye : EyeOff} size={20} color="ink3" />
          </Tap>
        )}
      </View>
      {error ? (
        <Text variant="meta" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta" color="ink3">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  box: { flexDirection: 'row', paddingHorizontal: 14, gap: 10 },
  iconTop: { paddingTop: 14 },
  input: { flex: 1, minHeight: 50 },
});
