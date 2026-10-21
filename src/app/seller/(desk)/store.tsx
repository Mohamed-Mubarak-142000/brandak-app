import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { signOut } from '@/auth/use-auth';
import { MenuGroup, MenuRow } from '@/features/account/menu-row';
import { AtSign, Ban, Bell, CircleAlert, CircleHelp, CreditCard, Eye, FileText, Globe, KeyRound, LogOut, Mail, MessageCircle, Phone, Plus, Settings, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { qk, useCategories, useGovernorates, useMyBrand } from '@/api/queries';
import type { OwnerBrand, ShippingZone, StoreType } from '@/api/types';
import { STORE_TYPES, storeTypeInfo } from '@/features/catalog/store-types';
import { DeskHeader } from '@/features/seller/desk-header';
import { ImageSlot, type UploadedImage } from '@/features/seller/image-slot';
import { displaySocial, normalizeSocial } from '@/features/seller/links';
import { haptic } from '@/lib/haptics';
import { latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { Banner, Button, Card, Chip, IconButton, MultiSelect, Select, Sheet, Skeleton, Text, TextField, toast } from '@/ui';

const num = (s: string) => {
  const n = Number(latinDigits(s).trim());
  return s.trim() !== '' && Number.isFinite(n) ? n : null;
};

/** Store profile + shipping settings (PATCH /brands/me). Also reachable while under review. */
export default function StoreSettings() {
  const t = useTheme();
  const brand = useMyBrand();
  if (!brand.data)
    return (
      <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
        <DeskHeader title='المتجر' />
        <View style={styles.content}>
          <Skeleton height={180} />
          <Skeleton height={300} />
        </View>
      </View>
    );
  return <StoreForm key={brand.data.id} b={brand.data} />;
}

function StoreForm({ b }: { b: OwnerBrand }) {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const govs = useGovernorates();
  const s0 = b.settings;

  const [storeType, setStoreType] = useState<StoreType>(b.storeType ?? 'BRAND');
  const categories = useCategories(storeType);
  const [name, setName] = useState(b.name);
  const [description, setDescription] = useState(b.description ?? '');
  const [cats, setCats] = useState<string[]>(b.categoryIds);
  const [logo, setLogo] = useState<UploadedImage | null>(b.logoUrl ? { fileId: '', url: b.logoUrl } : null);
  const [cover, setCover] = useState<UploadedImage | null>(b.coverUrl ? { fileId: '', url: b.coverUrl } : null);
  const [phone, setPhone] = useState(b.contact?.phone?.replace(/^\+20/, '0') ?? '');
  const [whatsapp, setWhatsapp] = useState(b.contact?.whatsapp?.replace(/^\+20/, '0') ?? '');
  const [email, setEmail] = useState(b.contact?.email ?? '');
  const [instagram, setInstagram] = useState(displaySocial(b.socialLinks?.instagram));
  const [facebook, setFacebook] = useState(displaySocial(b.socialLinks?.facebook));
  const [website, setWebsite] = useState(displaySocial(b.socialLinks?.website));
  const [zones, setZones] = useState<ShippingZone[]>(s0.shippingZones);
  const [defaultFee, setDefaultFee] = useState(s0.defaultShippingFee != null ? String(s0.defaultShippingFee) : '');
  const [freeOver, setFreeOver] = useState(s0.freeShippingThreshold != null ? String(s0.freeShippingThreshold) : '');
  const [minOrder, setMinOrder] = useState(s0.minOrderAmount ? String(s0.minOrderAmount) : '');
  const [days, setDays] = useState(String(s0.processingDays ?? 2));
  const [shippingPolicy, setShippingPolicy] = useState(s0.shippingPolicy ?? '');
  const [returnPolicy, setReturnPolicy] = useState(s0.returnPolicy ?? '');
  const [accepts, setAccepts] = useState(s0.acceptsOrders);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [zoneGov, setZoneGov] = useState('');
  const [zoneFee, setZoneFee] = useState('');

  const save = useMutation({
    mutationFn: () =>
      api.patch<OwnerBrand>('/brands/me', {
        storeType,
        name: name.trim(),
        description: description.trim(),
        categoryIds: cats,
        contact: {
          phone: latinDigits(phone).replace(/\s/g, ''),
          whatsapp: latinDigits(whatsapp).replace(/\s/g, '') || undefined,
          email: email.trim() || undefined,
        },
        socialLinks: {
          instagram: normalizeSocial('instagram', instagram),
          facebook: normalizeSocial('facebook', facebook),
          website: normalizeSocial('website', website),
        },
        settings: {
          shippingZones: zones,
          defaultShippingFee: num(defaultFee),
          freeShippingThreshold: num(freeOver),
          minOrderAmount: num(minOrder) ?? 0,
          processingDays: Math.round(num(days) ?? 2),
          shippingPolicy: shippingPolicy.trim(),
          returnPolicy: returnPolicy.trim(),
          acceptsOrders: accepts,
        },
      }),
    onSuccess: (nb) => {
      haptic.success();
      qc.setQueryData(qk.myBrand, nb);
      qc.invalidateQueries({ queryKey: qk.brand(nb.slug) });
      toast.success('اتحفظت إعدادات المتجر');
    },
    onError: () => haptic.error(),
  });

  // Logo and cover are saved the moment they finish uploading. Before, they waited for the
  // "save" button at the bottom of a long form, and a picked logo that was never saved looked
  // like an image that "doesn't show" everywhere else in the app.
  const saveImage = (field: 'logoFileId' | 'coverFileId', img: UploadedImage, set: (v: UploadedImage | null) => void, prev: UploadedImage | null) => {
    set(img);
    api
      .patch<OwnerBrand>('/brands/me', { [field]: img.fileId })
      .then((nb) => {
        qc.setQueryData(qk.myBrand, nb);
        qc.invalidateQueries({ queryKey: qk.brand(nb.slug) });
        toast.success(field === 'logoFileId' ? 'اتحفظ اللوجو' : 'اتحفظ الغلاف');
      })
      .catch((e) => {
        set(prev);
        toast.error(errorMessage(e));
      });
  };

  const govName = (code: string) => govs.data?.find((g) => g.code === code)?.ar ?? code;

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <DeskHeader
        title="المتجر"
        subtitle={b.isVisible ? 'ظاهر للعملاء' : 'مش ظاهر للعملاء دلوقتي'}
        end={<IconButton icon={Eye} label="معاينة المتجر" background="surface" onPress={() => router.push({ pathname: '/brand/[slug]', params: { slug: b.slug } })} />}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {save.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(save.error)} />}

        <Section title="الهوية">
          <Select
            label="نوع النشاط"
            value={storeType}
            onChange={(type) => {
              // Categories differ per type; pick again for the new one.
              if (type !== storeType) setCats([]);
              setStoreType(type);
            }}
            options={STORE_TYPES.map((x) => ({ value: x.type, label: x.label, description: x.description, icon: x.icon }))}
          />
          <ImageSlot label="الغلاف" purpose="BRAND_COVER" value={cover} onChange={(img) => saveImage('coverFileId', img, setCover, cover)} aspect={[16, 9]} width="100%" height={150} />
          <View style={styles.logoRow}>
            <ImageSlot label="اللوجو" purpose="BRAND_LOGO" value={logo} onChange={(img) => saveImage('logoFileId', img, setLogo, logo)} width={92} round />
            <View style={styles.flex}>
              <TextField label={storeTypeInfo(storeType).nameLabel} placeholder="مثال: معرض النور للأجهزة" value={name} onChangeText={setName} maxLength={60} />
            </View>
          </View>
          <TextField label="الوصف" placeholder="بتبيعوا إيه؟ وإيه اللي يميزكم؟" multiline value={description} onChangeText={setDescription} maxLength={1000} />
          <MultiSelect
            label="الأقسام"
            placeholder="اختار من 1 لـ 5 أقسام"
            sheetTitle="أقسام المتجر"
            max={5}
            value={cats}
            onChange={setCats}
            loading={categories.isLoading}
            options={(categories.data ?? []).filter((c) => c.isActive).map((c) => ({ value: c._id, label: c.nameAr }))}
          />
        </Section>

        <Section title="التواصل">
          <TextField label="موبايل المتجر" placeholder="01012345678" icon={Phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr />
          <TextField label="واتساب" placeholder="01012345678" icon={MessageCircle} optional value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" ltr />
          <TextField label="البريد" placeholder="store@mail.com" icon={Mail} optional value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" ltr />
          <TextField label="إنستجرام" placeholder="@store" icon={AtSign} optional value={instagram} onChangeText={setInstagram} autoCapitalize="none" ltr />
          <TextField label="فيسبوك" placeholder="facebook.com/store" icon={Globe} optional value={facebook} onChangeText={setFacebook} autoCapitalize="none" ltr />
          <TextField label="الموقع" placeholder="store.com" icon={Globe} optional value={website} onChangeText={setWebsite} autoCapitalize="none" ltr />
        </Section>

        <Section title="الشحن والطلبات">
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text variant="bodyStrong">استقبال طلبات</Text>
              <Text variant="meta" color="ink3">
                اقفلها مؤقتاً لو في أجازة أو المخزون خلص
              </Text>
            </View>
            <Switch value={accepts} onValueChange={setAccepts} trackColor={{ true: t.c.accent, false: t.c.lineStrong }} thumbColor="#fff" accessibilityLabel="استقبال طلبات" />
          </View>
          <Text variant="ui" color="ink2">
            مصاريف الشحن حسب المحافظة
          </Text>
          {zones.map((z) => (
            <View key={z.governorate} style={[styles.zone, { borderColor: t.c.line }]}>
              <Text variant="ui" style={styles.flex}>
                {govName(z.governorate)}
              </Text>
              <Text variant="ui" weight="bold">
                {z.fee} ج
              </Text>
              <IconButton icon={Trash2} label={`حذف ${govName(z.governorate)}`} size={36} color="danger" onPress={() => setZones((x) => x.filter((y) => y.governorate !== z.governorate))} />
            </View>
          ))}
          <Button label="إضافة محافظة" icon={Plus} variant="soft" size="md" onPress={() => setZoneOpen(true)} />
          <TextField label="الشحن لباقي المحافظات" placeholder="مثال: 80" optional value={defaultFee} onChangeText={setDefaultFee} keyboardType="decimal-pad" ltr hint="سيبه فاضي لو مش بتوصّل لغير المحافظات اللي فوق" />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField label="شحن مجاني فوق" placeholder="مثال: 1000" optional value={freeOver} onChangeText={setFreeOver} keyboardType="decimal-pad" ltr />
            </View>
            <View style={styles.flex}>
              <TextField label="أقل قيمة طلب" placeholder="مثال: 200" optional value={minOrder} onChangeText={setMinOrder} keyboardType="decimal-pad" ltr />
            </View>
          </View>
          <TextField label="أيام التجهيز" placeholder="مثال: 2" value={days} onChangeText={setDays} keyboardType="number-pad" ltr />
          <TextField label="سياسة الشحن" placeholder="مثال: بنشحن خلال يومين، والتوصيل من 2 لـ 5 أيام حسب المحافظة." optional multiline value={shippingPolicy} onChangeText={setShippingPolicy} maxLength={2000} />
          <TextField label="سياسة الاسترجاع" placeholder="مثال: الاسترجاع خلال 14 يوم والمنتج بحالته الأصلية." optional multiline value={returnPolicy} onChangeText={setReturnPolicy} maxLength={2000} />
        </Section>

        <Button label="حسابي مع فاترينة" icon={CreditCard} variant="secondary" onPress={() => router.push('/seller/balance')} />
        <Button label="حفظ التغييرات" loading={save.isPending} onPress={() => (cats.length ? save.mutate() : toast.error('اختار قسم واحد على الأقل للمتجر'))} />

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

      <Sheet
        open={zoneOpen}
        onClose={() => setZoneOpen(false)}
        title="إضافة محافظة"
        footer={
          <Button
            label="إضافة"
            disabled={!zoneGov || num(zoneFee) == null}
            onPress={() => {
              setZones((x) => [...x.filter((z) => z.governorate !== zoneGov), { governorate: zoneGov, fee: num(zoneFee)! }]);
              setZoneGov('');
              setZoneFee('');
              setZoneOpen(false);
            }}
          />
        }
      >
        <TextField label="مصاريف الشحن (ج.م)" placeholder="مثال: 50" value={zoneFee} onChangeText={setZoneFee} keyboardType="decimal-pad" ltr />
        <View style={styles.wrap}>
          {(govs.data ?? [])
            .filter((g) => !zones.some((z) => z.governorate === g.code))
            .map((g) => (
              <Chip key={g.code} label={g.ar} selected={zoneGov === g.code} onPress={() => setZoneGov(g.code)} />
            ))}
        </View>
      </Sheet>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.gap}>
      <Text variant="section">{title}</Text>
      <Card style={styles.gap}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  gap: { gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth },
});
