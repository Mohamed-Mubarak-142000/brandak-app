import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Illustration, Text, type IllustrationName } from '@/ui';

/** Compact "no data" card for a home section, sized to sit inside a horizontal rail. */
export function InlineEmpty({ art, title, body, width }: { art: IllustrationName; title: string; body?: string; width: number }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { width, backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.lg }]}>
      <Illustration name={art} size={72} />
      <View style={styles.copy}>
        <Text variant="ui" weight="semibold">
          {title}
        </Text>
        {body && (
          <Text variant="meta" color="ink3">
            {body}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  copy: { flex: 1, gap: 2 },
});
