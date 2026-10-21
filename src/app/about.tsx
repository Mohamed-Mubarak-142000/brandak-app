import { useRouter } from 'expo-router';
import { BadgeCheck, CircleHelp, FileText, HandCoins, Heart, Shield, Sparkles } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { MenuGroup, MenuRow } from '@/features/account/menu-row';
import { ABOUT, SUPPORT_EMAIL } from '@/features/info/content';
import { useTheme } from '@/theme';
import { AppBar, Icon, Illustration, Screen, Text } from '@/ui';

const VALUE_ICONS = [BadgeCheck, HandCoins, Heart, Sparkles];

export default function AboutScreen() {
  const t = useTheme();
  const router = useRouter();
  return (
    <Screen header={<AppBar title={ABOUT.title} />}>
      <View style={styles.hero}>
        <Illustration name="store" size={170} />
        <Text variant="page" align="center">
          فاترينة
        </Text>
        <Text variant="lead" color="ink2" align="center">
          {ABOUT.lead}
        </Text>
      </View>

      <View style={styles.gap}>
        {ABOUT.story.map((p) => (
          <Text key={p} variant="body" color="ink2">
            {p}
          </Text>
        ))}
      </View>

      <View style={styles.values}>
        {ABOUT.values.map((v, i) => (
          <View key={v.title} style={[styles.value, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.lg }]}>
            <View style={[styles.valueIcon, { backgroundColor: t.c.accentSoft }]}>
              <Icon as={VALUE_ICONS[i % VALUE_ICONS.length]} color="accent" size={20} />
            </View>
            <Text variant="ui" weight="bold">
              {v.title}
            </Text>
            <Text variant="meta" color="ink2">
              {v.body}
            </Text>
          </View>
        ))}
      </View>

      <MenuGroup title="اعرف أكتر">
        <MenuRow icon={CircleHelp} label="الأسئلة الشائعة" onPress={() => router.push('/faq')} />
        <MenuRow icon={FileText} label="الشروط والأحكام" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} />
        <MenuRow icon={Shield} label="سياسة الخصوصية" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} last />
      </MenuGroup>

      <Text variant="meta" color="ink3" align="center" selectable>
        تواصل معانا: {SUPPORT_EMAIL}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4 },
  gap: { gap: 10 },
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  value: { flexBasis: '47%', flexGrow: 1, padding: 14, gap: 6, borderWidth: StyleSheet.hairlineWidth },
  valueIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
