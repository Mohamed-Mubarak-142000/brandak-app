import { useRouter } from 'expo-router';
import {
  Ban,
  Bell,
  ChevronLeft,
  CircleHelp,
  CreditCard,
  Eye,
  FileText,
  Globe,
  KeyRound,
  LogOut,
  Megaphone,
  Search,
  Settings,
  Store,
  TicketPercent,
} from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { useCommission, useMyBrand } from '@/api/queries';
import { signOut } from '@/auth/use-auth';
import { MenuGroup, MenuRow } from '@/features/account/menu-row';
import { BrandLogo } from '@/features/catalog/brand-card';
import { DeskHeader } from '@/features/seller/desk-header';
import { formatMoney } from '@/lib/format';
import { useTheme } from '@/theme';
import { Badge, Card, Icon, IconButton, Skeleton, Tap, Text } from '@/ui';

/** The store hub: settings, money, marketing and account, each one tap away. */
export default function StoreHub() {
  const t = useTheme();
  const router = useRouter();
  const brand = useMyBrand();
  const commission = useCommission();
  const b = brand.data;
  const owed = commission.data?.balance ?? 0;

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <DeskHeader
        title="المتجر"
        subtitle={b ? (b.isVisible ? 'ظاهر للعملاء' : 'مش ظاهر للعملاء دلوقتي') : undefined}
        end={b ? <IconButton icon={Eye} label="معاينة المتجر" background="surface" onPress={() => router.push({ pathname: '/brand/[slug]', params: { slug: b.slug } })} /> : undefined}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!b ? (
          <Skeleton height={96} />
        ) : (
          <Tap onPress={() => router.push('/seller/store-settings')} pressScale={0.99} accessibilityLabel="إعدادات المتجر">
            <Card style={styles.summary}>
              <BrandLogo uri={b.logoUrl} size={56} name={b.name} />
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {b.name}
                </Text>
                <View style={styles.inline}>
                  <Badge label={b.isVisible ? 'ظاهر' : 'مش ظاهر'} tone={b.isVisible ? 'success' : 'warning'} />
                  {!b.settings.acceptsOrders && <Badge label="الطلبات مقفولة" tone="danger" />}
                </View>
              </View>
              <Text variant="ui" color="accent" weight="semibold">
                تعديل
              </Text>
              <Icon as={ChevronLeft} color="ink3" />
            </Card>
          </Tap>
        )}

        <MenuGroup title="المتجر">
          <MenuRow icon={Store} label="البيانات والشحن والاسترجاع" onPress={() => router.push('/seller/store-settings')} />
          <MenuRow icon={CreditCard} label="حسابي مع فاترينة" value={owed > 0 ? `مستحق ${formatMoney(owed)}` : undefined} onPress={() => router.push('/seller/balance')} last />
        </MenuGroup>
        <MenuGroup title="التسويق">
          <MenuRow icon={TicketPercent} label="كوبونات الخصم" onPress={() => router.push('/seller/coupons')} />
          <MenuRow icon={Megaphone} label="إعلانات مميزة" onPress={() => router.push('/seller/ads')} />
          <MenuRow icon={Globe} label="لينك المتجر والبيكسل" onPress={() => router.push('/seller/marketing')} />
          <MenuRow icon={Search} label="الناس بتدوّر على إيه" onPress={() => router.push('/seller/insights')} last />
        </MenuGroup>
        <MenuGroup title="الحساب">
          <MenuRow icon={Bell} label="الإشعارات" onPress={() => router.push('/notifications')} />
          <MenuRow icon={Ban} label="العملاء المحظورين" onPress={() => router.push('/seller/blocks')} />
          <MenuRow icon={KeyRound} label="تغيير كلمة السر" onPress={() => router.push('/change-password')} />
          <MenuRow icon={Settings} label="الإعدادات والمظهر" onPress={() => router.push('/settings')} last />
        </MenuGroup>
        <MenuGroup title="المساعدة">
          <MenuRow icon={CircleHelp} label="الأسئلة الشائعة" onPress={() => router.push('/faq')} />
          <MenuRow icon={FileText} label="الشروط والأحكام" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} last />
        </MenuGroup>
        <MenuGroup>
          <MenuRow
            icon={LogOut}
            label="تسجيل الخروج"
            tone="danger"
            onPress={() =>
              Alert.alert('تسجيل الخروج؟', 'هتحتاج تسجل دخول تاني عشان تدير متجرك.', [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'خروج', style: 'destructive', onPress: () => signOut().then(() => router.replace('/(tabs)')) },
              ])
            }
            last
          />
        </MenuGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inline: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
});
