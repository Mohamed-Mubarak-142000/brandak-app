import { useRouter } from 'expo-router';
import { ChevronDown, Search } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { FAQ, SUPPORT_EMAIL } from '@/features/info/content';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Chip, Icon, Screen, Tap, Text, TextField } from '@/ui';

/** Questions grouped by topic; tap to open an answer. Search filters across all groups. */
export default function FaqScreen() {
  const t = useTheme();
  const router = useRouter();
  const [group, setGroup] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const q = query.trim();
  const groups = FAQ.filter((g) => !group || g.title === group)
    .map((g) => ({ ...g, items: q ? g.items.filter((i) => i.q.includes(q) || i.a.includes(q)) : g.items }))
    .filter((g) => g.items.length);

  return (
    <Screen header={<AppBar title="الأسئلة الشائعة" />}>
      <TextField label="بحث" icon={Search} value={query} onChangeText={setQuery} placeholder="مثال: الدفع، الشحن، العمولة" returnKeyType="search" />
      <View style={styles.wrap}>
        <Chip label="الكل" selected={!group} onPress={() => setGroup(null)} />
        {FAQ.map((g) => (
          <Chip key={g.title} label={g.title} selected={group === g.title} onPress={() => setGroup(g.title)} />
        ))}
      </View>

      {groups.map((g) => (
        <View key={g.title} style={styles.group}>
          <Text variant="section">{g.title}</Text>
          <View style={[styles.card, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.lg }]}>
            {g.items.map((item, i) => {
              const id = `${g.title}:${item.q}`;
              const on = open === id;
              return (
                <View key={id} style={[styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.c.line }]}>
                  <Tap
                    onPress={() => {
                      haptic.tap();
                      setOpen(on ? null : id);
                    }}
                    pressScale={1}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: on }}
                    style={styles.question}
                  >
                    <Text variant="ui" weight="semibold" style={styles.flex}>
                      {item.q}
                    </Text>
                    <View style={on && styles.flip}>
                      <Icon as={ChevronDown} size={20} color={on ? 'accent' : 'ink3'} />
                    </View>
                  </Tap>
                  {on && (
                    <Animated.View entering={FadeIn.duration(180)}>
                      <Text variant="ui" color="ink2" style={styles.answer}>
                        {item.a}
                      </Text>
                    </Animated.View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {!groups.length && (
        <Text variant="ui" color="ink3" align="center">
          مفيش سؤال بالكلام ده. جرّب كلمة تانية.
        </Text>
      )}

      <View style={[styles.contact, { backgroundColor: t.c.accentSoft, borderRadius: t.radius.lg }]}>
        <Text variant="bodyStrong">ملقتش إجابتك؟</Text>
        <Text variant="ui" color="ink2">
          ابعتلنا على{' '}
          <Text variant="ui" color="accent" weight="semibold" selectable>
            {SUPPORT_EMAIL}
          </Text>{' '}
          وهنرد عليك في أقرب وقت.
        </Text>
        <View style={styles.links}>
          <Tap onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} pressScale={1} hitSlop={8}>
            <Text variant="ui" color="accent">
              الشروط والأحكام
            </Text>
          </Tap>
          <Tap onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} pressScale={1} hitSlop={8}>
            <Text variant="ui" color="accent">
              سياسة الخصوصية
            </Text>
          </Tap>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  group: { gap: 10 },
  card: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  item: { paddingVertical: 2 },
  question: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 8 },
  flip: { transform: [{ rotate: '180deg' }] },
  answer: { paddingBottom: 12 },
  contact: { padding: 16, gap: 6 },
  links: { flexDirection: 'row', gap: 20, marginTop: 4 },
});
