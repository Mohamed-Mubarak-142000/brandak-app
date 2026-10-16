import { Check, Info, Monitor, Moon, Sun } from 'lucide-react-native';

import { MenuGroup, MenuRow } from '@/features/account/menu-row';
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
      <Text variant="meta" color="ink3" align="center">
        براندك — سوق البراندات المصرية. صُنع بحب في مصر.
      </Text>
    </Screen>
  );
}
