import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LEGAL_UPDATED, PRIVACY, SUPPORT_EMAIL, TERMS } from '@/features/info/content';
import { useTheme } from '@/theme';
import { AppBar, Screen, Text } from '@/ui';

/** Terms (/legal/terms) and privacy (/legal/privacy): numbered sections, plain reading text. */
export default function LegalScreen() {
  const t = useTheme();
  const { doc } = useLocalSearchParams<{ doc: 'terms' | 'privacy' }>();
  const content = doc === 'privacy' ? PRIVACY : TERMS;

  return (
    <Screen header={<AppBar title={content.title} />}>
      <View style={styles.gapSm}>
        <Text variant="meta" color="ink3">
          آخر تحديث: {LEGAL_UPDATED}
        </Text>
        <Text variant="body" color="ink2">
          {content.intro}
        </Text>
      </View>
      {content.sections.map((s) => (
        <View key={s.title} style={styles.gapSm}>
          <Text variant="bodyStrong" accessibilityRole="header">
            {s.title}
          </Text>
          {!!s.body && (
            <Text variant="ui" color="ink2">
              {s.body}
            </Text>
          )}
          {s.points?.map((p) => (
            <View key={p} style={styles.point}>
              <View style={[styles.bullet, { backgroundColor: t.c.brand }]} />
              <Text variant="ui" color="ink2" style={styles.flex}>
                {p}
              </Text>
            </View>
          ))}
        </View>
      ))}
      <View style={[styles.contact, { backgroundColor: t.c.sunken, borderRadius: t.radius.md }]}>
        <Text variant="ui" weight="semibold">
          عندك سؤال؟
        </Text>
        <Text variant="ui" color="ink2">
          ابعتلنا على{' '}
          <Text variant="ui" color="accent" selectable>
            {SUPPORT_EMAIL}
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gapSm: { gap: 8 },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  contact: { padding: 14, gap: 4 },
});
