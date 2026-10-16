import { useRouter } from 'expo-router';
import { ArrowRight, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/ui/brand-mark';
import { IconButton, Text } from '@/ui';

/** Top of every auth screen: close/back, the mark, a title and a one-line promise. */
export function AuthHeader({ title, subtitle, close }: { title: string; subtitle?: string; close?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 4 }}>
      <View style={styles.bar}>
        <IconButton
          icon={close ? X : ArrowRight}
          label={close ? 'إغلاق' : 'رجوع'}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        />
      </View>
      <View style={styles.head}>
        <BrandMark size={40} />
        <Text variant="page" style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle && (
          <Text variant="body" color="ink2">
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingHorizontal: 8 },
  head: { paddingHorizontal: 20, paddingTop: 8, gap: 4 },
  title: { marginTop: 12 },
});
