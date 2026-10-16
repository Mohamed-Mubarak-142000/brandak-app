import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, AtSign, Check, CircleAlert, Globe, Mail, MessageCircle, Phone, Store } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeOutRight, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { api, errorMessage } from '@/api/client';
import { qk, useCategories } from '@/api/queries';
import type { OwnerBrand } from '@/api/types';
import { meKey, useMe } from '@/auth/use-auth';
import { ImageSlot, type UploadedImage } from '@/features/seller/image-slot';
import { normalizeSocial } from '@/features/seller/links';
import { haptic } from '@/lib/haptics';
import { EG_MOBILE, latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Chip, Illustration, Screen, Text, TextField } from '@/ui';

const STEPS = ['البراند', 'الأقسام', 'التواصل', 'الصور'];

export default function Apply() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const categories = useCategories();
  const [step, setStep] = useState(-1); // -1 = intro
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [phone, setPhone] = useState(me.data?.phone?.replace(/^\+20/, '0') ?? '');
  const [email, setEmail] = useState(me.data?.email ?? '');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState<UploadedImage | null>(null);
  const [cover, setCover] = useState<UploadedImage | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useMutation({
    mutationFn: () =>
      api.post<OwnerBrand>('/brand-applications', {
        name: name.trim(),
        description: description.trim() || undefined,
        categoryIds: cats,
        contact: {
          phone: latinDigits(phone).replace(/\s/g, ''),
          email: email.trim() || undefined,
          whatsapp: latinDigits(whatsapp).replace(/\s/g, '') || undefined,
        },
        socialLinks: {
          instagram: normalizeSocial('instagram', instagram),
          facebook: normalizeSocial('facebook', facebook),
          website: normalizeSocial('website', website),
        },
        logoFileId: logo?.fileId,
        coverFileId: cover?.fileId,
      }),
    onSuccess: async (brand) => {
      haptic.success();
      qc.setQueryData(qk.myBrand, brand);
      await qc.invalidateQueries({ queryKey: meKey });
      router.replace('/seller');
    },
    onError: () => haptic.error(),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0 && name.trim().length < 2) e.name = 'اسم البراند حرفين على الأقل';
    if (step === 1 && !cats.length) e.cats = 'اختار قسم واحد على الأقل';
    if (step === 2) {
      if (!EG_MOBILE.test(latinDigits(phone).replace(/\s/g, ''))) e.phone = 'رقم موبايل مصري غير صحيح';
      if (whatsapp && !EG_MOBILE.test(latinDigits(whatsapp).replace(/\s/g, ''))) e.whatsapp = 'رقم واتساب غير صحيح';
      if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'بريد إلكتروني غير صحيح';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => {
    if (!validate()) return haptic.warning();
    haptic.tap();
    if (step === STEPS.length - 1) submit.mutate();
    else setStep((s) => s + 1);
  };

  if (step === -1)
    return (
      <Screen header={<AppBar title="افتح متجرك" />} footer={<Button label="يلا نبدأ" iconEnd={ArrowLeft} onPress={() => setStep(0)} />}>
        <View style={styles.intro}>
          <Illustration name="store" size={200} />
          <Text variant="page" align="center">
            براندك على براندك
          </Text>
          <Text variant="body" color="ink2" align="center">
            وصّل منتجاتك لعملاء في كل محافظات مصر، والدفع كاش عند الاستلام.
          </Text>
        </View>
        {[
          ['قدّم بيانات البراند', 'دقيقتين بالظبط — الاسم والأقسام وطرق التواصل'],
          ['فريقنا يراجع الطلب', 'عادةً خلال يوم عمل، وهيوصلك إشعار'],
          ['اختار باقتك وادفع بـ InstaPay', 'ارفع صورة التحويل ونفعّل الاشتراك'],
          ['ابدأ تبيع', 'ضيف منتجاتك واستقبل الطلبات من موبايلك'],
        ].map(([title, body], i) => (
          <View key={title} style={styles.howRow}>
            <View style={[styles.howNum, { backgroundColor: t.c.accentSoft }]}>
              <Text variant="ui" weight="bold" color="accent">
                {i + 1}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text variant="ui" weight="bold">
                {title}
              </Text>
              <Text variant="meta" color="ink2">
                {body}
              </Text>
            </View>
          </View>
        ))}
      </Screen>
    );

  return (
    <Screen
      keyboard
      header={<AppBar title={`الخطوة ${step + 1} من ${STEPS.length}`} />}
      footer={
        <View style={styles.footer}>
          {step > 0 && <Button label="رجوع" variant="secondary" block={false} onPress={() => setStep((s) => s - 1)} />}
          <Button
            label={step === STEPS.length - 1 ? 'إرسال الطلب للمراجعة' : 'التالي'}
            iconEnd={step === STEPS.length - 1 ? Check : ArrowLeft}
            loading={submit.isPending}
            onPress={next}
            style={styles.flex}
          />
        </View>
      }
    >
      <Progress step={step} />
      {submit.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(submit.error)} />}

      <Animated.View key={step} entering={FadeInLeft.duration(240)} exiting={FadeOutRight.duration(120)} style={styles.gap}>
        {step === 0 && (
          <>
            <Text variant="section">عرّفنا على البراند</Text>
            <TextField label="اسم البراند" icon={Store} value={name} onChangeText={setName} maxLength={60} error={errors.name} autoFocus />
            <TextField
              label="وصف قصير"
              optional
              multiline
              value={description}
              onChangeText={setDescription}
              maxLength={1000}
              placeholder="بتبيعوا إيه؟ وإيه اللي يميزكم؟"
              hint={`${description.length}/1000`}
            />
          </>
        )}
        {step === 1 && (
          <>
            <Text variant="section">البراند بيبيع في أنهي أقسام؟</Text>
            <Text variant="ui" color={errors.cats ? 'danger' : 'ink2'}>
              {errors.cats ?? `اختار من 1 لـ 5 أقسام (${cats.length}/5)`}
            </Text>
            <View style={styles.wrap}>
              {(categories.data ?? [])
                .filter((c) => c.isActive)
                .map((c) => {
                  const on = cats.includes(c._id);
                  return (
                    <Chip
                      key={c._id}
                      label={c.nameAr}
                      selected={on}
                      icon={on ? Check : undefined}
                      disabled={!on && cats.length >= 5}
                      onPress={() => setCats((x) => (on ? x.filter((i) => i !== c._id) : [...x, c._id]))}
                    />
                  );
                })}
            </View>
          </>
        )}
        {step === 2 && (
          <>
            <Text variant="section">إزاي العملاء يوصلولكم؟</Text>
            <TextField label="موبايل البراند" icon={Phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr error={errors.phone} />
            <TextField label="واتساب" icon={MessageCircle} optional value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" ltr error={errors.whatsapp} />
            <TextField label="البريد الإلكتروني" icon={Mail} optional value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" ltr error={errors.email} />
            <TextField label="إنستجرام" icon={AtSign} optional value={instagram} onChangeText={setInstagram} autoCapitalize="none" ltr placeholder="@brand" />
            <TextField label="فيسبوك" icon={Globe} optional value={facebook} onChangeText={setFacebook} autoCapitalize="none" ltr placeholder="facebook.com/brand" />
            <TextField label="الموقع" icon={Globe} optional value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" ltr placeholder="brand.com" />
          </>
        )}
        {step === 3 && (
          <>
            <Text variant="section">اللوجو والغلاف</Text>
            <Text variant="ui" color="ink2">
              صور واضحة بتخلي العملاء يثقوا في البراند أكتر. تقدر تضيفها بعدين كمان.
            </Text>
            <ImageSlot label="الغلاف (عرضي)" purpose="BRAND_COVER" value={cover} onChange={setCover} aspect={[16, 9]} width="100%" height={170} />
            <View style={styles.logoRow}>
              <ImageSlot label="اللوجو" purpose="BRAND_LOGO" value={logo} onChange={setLogo} width={110} round />
              <View style={styles.flex}>
                <Text variant="bodyStrong">{name}</Text>
                <Text variant="meta" color="ink3">
                  JPG أو PNG أو WEBP، لحد 4 ميجا
                </Text>
              </View>
            </View>
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

function Progress({ step }: { step: number }) {
  const t = useTheme();
  const bar = useAnimatedStyle(() => ({ width: withTiming(`${((step + 1) / STEPS.length) * 100}%`, { duration: 280 }) }));
  return (
    <View style={styles.gapSm} accessibilityLabel={`الخطوة ${step + 1} من ${STEPS.length}: ${STEPS[step]}`}>
      <View style={[styles.track, { backgroundColor: t.c.line }]}>
        <Animated.View style={[styles.fill, { backgroundColor: t.c.brand }, bar]} />
      </View>
      <View style={styles.labels}>
        {STEPS.map((s, i) => (
          <Text key={s} variant="meta" color={i <= step ? 'accent' : 'ink3'} weight={i === step ? 'bold' : 'regular'}>
            {s}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 14 },
  gapSm: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  intro: { alignItems: 'center', gap: 8, paddingBottom: 8 },
  howRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  howNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: 10 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
