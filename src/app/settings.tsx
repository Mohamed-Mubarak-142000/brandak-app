import { useRouter } from 'expo-router';
import { Check, FileText, Info, Monitor, Moon, Shield, Sun, Trash2 } from 'lucide-react-native';
import { Linking } from 'react-native';

import { useSession } from '@/auth/session';

import { MenuGroup, MenuRow } from '@/features/account/menu-row';
import { LEGAL_WEB } from '@/features/info/content';
import { PREF, prefs } from '@/lib/storage';
import { useThemeMode, type ThemeMode } from '@/theme';
import { AppBar, Icon, Screen, Text, toast } from '@/ui';

const MODES: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: 'light', label: 'فاتح', icon: Sun },
  { key: 'dark', label: 'داكن', icon: Moon },
  { key: 'system', label: 'حسب إعدادات الجهاز', icon: Monitor },
];

export default function SettingsScreen() {
  const { mode, setMode } = useThemeMode();
  const router = useRouter();
  const authed = useSession((st) => st.status === 'authed');
  return (
    <Screen header={<AppBar title="الإعدادات" />}>
      <MenuGroup title="المظهر">
        {MODES.map((m, i) => (
          <MenuRow
            key={m.key}
            icon={m.icon}
            label={m.label}
            onPress={() => setMode(m.key)}
            end={mode === m.key ? <Icon as={Check} color="accent" /> : <></>}
            last={i === MODES.length - 1}
          />
        ))}
      </MenuGroup>
      <MenuGroup title="التفضيلات">
        <MenuRow
          icon={Info}
          label="اختيار اهتمامات التسوق من جديد"
          onPress={() => {
            prefs.set(PREF.interests, []);
            prefs.set(PREF.onboardingDone, false);
            toast.info('هتظهرلك المقدمة واختيار الاهتمامات في الفتحة الجاية');
          }}
        />
        <MenuRow
          icon={Info}
          label="مسح عمليات البحث السابقة"
          onPress={() => {
            prefs.set(PREF.recentSearches, []);
            toast.info('اتمسحت');
          }}
          last
        />
      </MenuGroup>
      <MenuGroup title="الخصوصية">
        <MenuRow icon={Shield} label="سياسة الخصوصية" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} />
        <MenuRow icon={FileText} label="نسخة الويب من السياسة" onPress={() => Linking.openURL(LEGAL_WEB.privacy).catch(() => undefined)} last={!authed} />
        {authed && <MenuRow icon={Trash2} label="حذف الحساب" tone="danger" onPress={() => router.push('/delete-account')} last />}
      </MenuGroup>
      <Text variant="meta" color="ink3" align="center">
        فاترينة — معارض ومخازن ومحلات وبراندات في مكان واحد. صُنع بحب في مصر.
      </Text>
    </Screen>
  );
}
