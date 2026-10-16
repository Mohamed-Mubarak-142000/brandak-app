import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { IconButton } from './button';
import { Text } from './text';

/**
 * Header bar. The back arrow points right in RTL (ArrowRight is "back" in Arabic reading order),
 * so it is not mirrored.
 */
export function AppBar({
  title,
  back = true,
  end,
  large,
  transparent,
}: {
  title?: string;
  back?: boolean;
  end?: ReactNode;
  large?: boolean;
  transparent?: boolean;
}) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + 4,
          backgroundColor: transparent ? 'transparent' : t.c.ground,
          borderBottomColor: transparent || large ? 'transparent' : t.c.line,
        },
      ]}
    >
      <View style={styles.side}>
        {back && router.canGoBack() && <IconButton icon={ArrowRight} label="رجوع" onPress={() => router.back()} />}
      </View>
      {!large && (
        <Text variant="bodyStrong" numberOfLines={1} style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      )}
      <View style={[styles.side, styles.end]}>{end}</View>
      {large && title && (
        <Text variant="page" accessibilityRole="header" style={styles.large}>
          {title}
        </Text>
      )}
    </View>
  );
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  footer,
  header,
  contentStyle,
  refreshControl,
  keyboard,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footer?: ReactNode;
  header?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: ScrollViewProps['refreshControl'];
  keyboard?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pad = padded ? t.space.lg : 0;
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[{ padding: pad, paddingBottom: pad + (footer ? 16 : insets.bottom + 24), gap: t.space.lg }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, { padding: pad }, contentStyle]}>{children}</View>
  );

  const content = (
    <>
      {header}
      {body}
      {footer && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: t.c.surface, borderTopColor: t.c.line }]}>
          {footer}
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      {keyboard ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { minWidth: 44, flexDirection: 'row', alignItems: 'center' },
  end: { justifyContent: 'flex-end' },
  title: { flex: 1, textAlign: 'center' },
  large: { width: '100%', paddingHorizontal: 8, paddingTop: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
});
