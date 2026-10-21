import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Bell,
  BellRing,
  UserCheck,
  Briefcase,
  ChevronLeft,
  CircleHelp,
  Heart,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Undo2,
  LogOut,
  MapPin,
  MessageSquareText,
  Moon,
  Mail,
  FileText,
  Info,
  Shield,
  Settings,
  ShoppingBag,
  Store,
} from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';

import { useUnreadCount } from '@/api/queries';
import { useSession } from '@/auth/session';
import { signOut, useMe } from '@/auth/use-auth';
import { MenuGroup, MenuRow } from '@/features/account/menu-row';
import { formatPhone } from '@/lib/format';
import { useTheme, useThemeMode } from '@/theme';
import { BrandMark } from '@/ui/brand-mark';
import { Banner, Button, Icon, Screen, Skeleton, Tap, Text } from '@/ui';

const THEME_LABEL = { system: 'حسب الجهاز', light: 'فاتح', dark: 'داكن' } as const;

export default function Account() {
  const t = useTheme();
  const router = useRouter();
  const authed = useSession((s) => s.status === 'authed');
  const me = useMe();
  const unread = useUnreadCount();
  const mode = useThemeMode((s) => s.mode);
  const u = me.data;

  const logout = () =>
    Alert.alert('تسجيل الخروج؟', 'هتحتاج تسجل دخول تاني عشان تطلب.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: () => signOut().then(() => router.replace('/(tabs)')) },
    ]);

  return (
    <Screen contentStyle={styles.content}>
      <Text variant="page" accessibilityRole="header" style={{ marginTop: 8 }}>
        حسابي
      </Text>

      {!authed ? (
        <View style={[styles.guest, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.lg }]}>
          <BrandMark size={44} />
          <Text variant="section" align="center">
            أهلاً بيك في فاترينة
          </Text>
          <Text variant="ui" color="ink2" align="center">
            اعمل حساب مشتري عشان تطلب وتتابع طلباتك، أو حساب بيزنس لو عندك معرض أو مخزن أو محل أو براند.
          </Text>
          <Button label="إنشاء حساب مشتري" icon={ShoppingBag} onPress={() => router.push('/(auth)/register')} />
          <Button
            label="إنشاء حساب بيزنس"
            icon={Briefcase}
            variant="soft"
            onPress={() => router.push({ pathname: '/(auth)/register', params: { intent: 'seller' } })}
          />
          <Button label="عندي حساب، تسجيل الدخول" variant="secondary" onPress={() => router.push('/(auth)/login')} />
        </View>
      ) : me.isLoading || !u ? (
        <Skeleton height={96} radius={16} />
      ) : (
        <>
          <View style={[styles.profile, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.lg }]}>
            <View style={[styles.avatar, { backgroundColor: t.c.accent }]}>
              <Text variant="section" color="onAccent">
                {u.name.trim().charAt(0)}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{u.name}</Text>
              <Text variant="meta" color="ink3">
                {formatPhone(u.phone)} · {u.email}
              </Text>
            </View>
          </View>
          {!u.emailVerified && (
            <Banner
              icon={Mail}
              tone="warning"
              title="بريدك الإلكتروني لسه مش متأكد"
              body="هنبعتلك كود على الإيميل. بنستخدمه كمان لو نسيت كلمة السر."
              action="أكّد"
              onAction={() => router.push({ pathname: '/(auth)/verify', params: { channel: 'email' } })}
            />
          )}
        </>
      )}

      {/* Seller entry */}
      <Tap
        onPress={() =>
          authed
            ? router.push(u?.brand ? '/seller' : '/seller/apply')
            : router.push({ pathname: '/(auth)/register', params: { intent: 'seller' } })
        }
        pressScale={0.99}
        accessibilityLabel={u?.brand ? 'لوحة المتجر' : 'افتح متجرك على فاترينة'}
      >
        <LinearGradient colors={[t.c.brand, t.c.accent]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.seller, { borderRadius: t.radius.lg }]}>
          <View style={styles.sellerIcon}>
            <Icon as={u?.brand ? LayoutDashboard : Store} color="onAccent" size={26} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong" style={styles.white}>
              {u?.brand ? 'لوحة المتجر' : 'عندك متجر؟ افتحه على فاترينة'}
            </Text>
            <Text variant="meta" style={styles.whiteSoft}>
              {u?.brand ? 'منتجاتك، طلباتك، وإحصائياتك' : 'وصّل لعملاء في كل مصر بخطوات بسيطة'}
            </Text>
          </View>
          <ChevronLeft size={22} color="#fff" />
        </LinearGradient>
      </Tap>

      {authed && (
        <MenuGroup title="التسوق">
          <MenuRow icon={Heart} label="المفضلة" onPress={() => router.push('/wishlist')} />
          <MenuRow icon={UserCheck} label="متاجر بتابعها" onPress={() => router.push('/following')} />
          <MenuRow icon={BellRing} label="تنبيهات الأسعار والمقاسات" onPress={() => router.push('/alerts')} />
          <MenuRow icon={MapPin} label="عناويني" onPress={() => router.push('/addresses')} />
          <MenuRow icon={Bell} label="الإشعارات" value={unread.data ? `${unread.data} جديد` : undefined} onPress={() => router.push('/notifications')} />
          <MenuRow icon={MessageSquareText} label="تقييماتي" onPress={() => router.push('/my-reviews')} />
          <MenuRow icon={Undo2} label="مرتجعاتي" onPress={() => router.push('/returns')} last />
        </MenuGroup>
      )}

      <MenuGroup title="الإعدادات">
        <MenuRow icon={Moon} label="المظهر" value={THEME_LABEL[mode]} onPress={() => router.push('/settings')} />
        {authed && <MenuRow icon={KeyRound} label="تغيير كلمة السر" onPress={() => router.push('/change-password')} />}
        <MenuRow icon={Settings} label="الإعدادات" onPress={() => router.push('/settings')} last />
      </MenuGroup>

      <MenuGroup title="المساعدة">
        {authed && <MenuRow icon={LifeBuoy} label="الدعم والشكاوى" onPress={() => router.push('/support')} />}
        <MenuRow icon={CircleHelp} label="الأسئلة الشائعة" onPress={() => router.push('/faq')} />
        <MenuRow icon={Info} label="من نحن" onPress={() => router.push('/about')} />
        <MenuRow icon={FileText} label="الشروط والأحكام" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} />
        <MenuRow icon={Shield} label="سياسة الخصوصية" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} last />
      </MenuGroup>

      {authed && (
        <MenuGroup>
          <MenuRow icon={LogOut} label="تسجيل الخروج" tone="danger" onPress={logout} last />
        </MenuGroup>
      )}
      <Text variant="meta" color="ink3" align="center">
        فاترينة · الإصدار 1.0.0
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 56 },
  flex: { flex: 1 },
  guest: { alignItems: 'center', gap: 10, padding: 20, borderWidth: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  seller: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  sellerIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  white: { color: '#fff' },
  whiteSoft: { color: 'rgba(255,255,255,0.88)' },
});
