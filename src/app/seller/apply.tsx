import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, AtSign, Check, CircleAlert, Copy, Globe, Mail, MessageCircle, Phone, Receipt, Store } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeOutRight, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { api, errorMessage } from '@/api/client';
import { qk, useCategories, useInstructions, usePlans } from '@/api/queries';
import type { BillingPeriod, OwnerBrand, PaymentView, StoreType, SubscriptionRequestResult } from '@/api/types';
import { planLimitsText } from '@/features/seller/plan-limits';
import { BILLING_LABEL, formatMoney } from '@/lib/format';
import { meKey, useMe } from '@/auth/use-auth';
import { StoreTypePicker } from '@/features/catalog/store-type-ui';
import { storeTypeInfo } from '@/features/catalog/store-types';
import { ImageSlot, type UploadedImage } from '@/features/seller/image-slot';
import { normalizeSocial } from '@/features/seller/links';
import { haptic } from '@/lib/haptics';
import { EG_MOBILE, latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { AppBar, Badge, Banner, Button, Card, Divider, Icon, Illustration, MultiSelect, Screen, Skeleton, Tap, Text, TextField, toast } from '@/ui';

const STEPS = ['النوع', 'البيانات', 'الأقسام', 'التواصل', 'الصور', 'الباقة', 'الدفع'];
const PLAN_STEP = 5;
const PAY_STEP = 6;

export default function Apply() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  // Prefilled when sign-up created the account but the store request failed.
  const params = useLocalSearchParams<{ storeType?: StoreType; name?: string }>();
  const [step, setStep] = useState(-1); // -1 = intro
  const [storeType, setStoreType] = useState<StoreType | null>(params.storeType ?? null);
  const info = storeTypeInfo(storeType);
  const categories = useCategories(storeType);
  const [name, setName] = useState(params.name ?? '');
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
  const plans = usePlans();
  const instructions = useInstructions();
  const [period, setPeriod] = useState<BillingPeriod>('MONTHLY');
  const [planId, setPlanId] = useState<string | null>(null);
  const [proof, setProof] = useState<UploadedImage | null>(null);
  const [reference, setReference] = useState('');
  // Kept across retries: a failed payment step must not re-create the store (BRAND_EXISTS).
  const [created, setCreated] = useState<OwnerBrand | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const planList = (plans.data ?? []).filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const plan = planList.find((p) => p._id === planId);
  const amount = plan ? (period === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly) : 0;
  // A free plan needs no payment step: the store is sent for review right from the plan step.
  const isFree = !!plan && amount === 0;
  const lastStep = isFree ? PLAN_STEP : PAY_STEP;

  /**
   * One button does the whole flow: create the store, request the chosen plan, and send the
   * transfer receipt if there is one. Each step is remembered so a retry continues where it failed.
   */
  const submit = useMutation({
    mutationFn: async () => {
      // The store and its plan are created together; a store can't exist without a plan.
      let brand = created;
      let subId = subscriptionId;
      if (!brand) {
        const res = await applyRequest();
        brand = res;
        subId = res.subscription?.subscription._id ?? null;
        setCreated(res);
        setSubscriptionId(subId);
        qc.setQueryData(qk.myBrand, res);
        if (res.subscription?.subscription.status === 'ACTIVE') return { brand, subscriptionId: null, paid: false };
      }
      if (!subId || !proof) return { brand, subscriptionId: subId, paid: false };
      await api.post<PaymentView>(`/brand/subscriptions/${subId}/payment-proofs`, {
        proofFileId: proof.fileId,
        transactionReference: latinDigits(reference).trim(),
        paidAt: new Date().toISOString(),
      });
      return { brand, subscriptionId: subId, paid: true };
    },
    onSuccess: async ({ subscriptionId: subId, paid }) => {
      haptic.success();
      qc.invalidateQueries({ queryKey: qk.mySubs });
      await qc.invalidateQueries({ queryKey: meKey });
      if (paid) toast.success('اتبعت طلب المتجر وإثبات الدفع للمراجعة');
      // No receipt yet: open the payment screen so the transfer details stay in front of them.
      if (subId && !paid) router.replace({ pathname: '/seller/pay/[subscriptionId]', params: { subscriptionId: subId } });
      else router.replace('/seller');
    },
    onError: () => haptic.error(),
  });

  const applyRequest = () =>
      api.post<OwnerBrand & { subscription?: SubscriptionRequestResult }>('/brand-applications', {
        planId,
        billingPeriod: period,
        storeType,
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
      });

  const copy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    haptic.light();
    toast.success(`اتنسخ ${label}`);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0 && !storeType) e.storeType = 'اختار نوع نشاطك';
    if (step === 1 && name.trim().length < 2) e.name = `${info.nameLabel} حرفين على الأقل`;
    if (step === 2 && !cats.length) e.cats = 'اختار قسم واحد على الأقل';
    if (step === 3) {
      if (!EG_MOBILE.test(latinDigits(phone).replace(/\s/g, ''))) e.phone = 'رقم موبايل مصري غير صحيح';
      if (whatsapp && !EG_MOBILE.test(latinDigits(whatsapp).replace(/\s/g, ''))) e.whatsapp = 'رقم واتساب غير صحيح';
      if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'بريد إلكتروني غير صحيح';
    }
    if (step === PLAN_STEP && !planId) e.plan = 'اختار باقة لمتجرك';
    if (step === PAY_STEP && proof) {
      const r = latinDigits(reference).trim();
      if (r.length < 4 || r.length > 64) e.ref = 'رقم العملية من 4 لـ 64 حرف';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => {
    if (!validate()) return haptic.warning();
    haptic.tap();
    if (step === lastStep) submit.mutate();
    else setStep((s) => s + 1);
  };

  if (step === -1)
    return (
      <Screen header={<AppBar title="افتح متجرك" />} footer={<Button label="يلا نبدأ" iconEnd={ArrowLeft} onPress={() => setStep(0)} />}>
        <View style={styles.intro}>
          <Illustration name="store" size={200} />
          <Text variant="page" align="center">
            متجرك على دكاكين
          </Text>
          <Text variant="body" color="ink2" align="center">
            عندك معرض أو مخزن أو محل أو براند؟ وصّل منتجاتك لعملاء في كل محافظات مصر، والدفع كاش عند الاستلام.
          </Text>
        </View>
        {[
          ['قدّم بيانات نشاطك', 'الاسم والأقسام وطرق التواصل والصور'],
          ['اختار باقتك وادفع بـ InstaPay', 'هتشوف المبلغ وبيانات التحويل، وترفع الإيصال في نفس الخطوات'],
          ['فريقنا يراجع الطلب والتحويل', 'عادةً خلال يوم عمل، وهيوصلك إشعار'],
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
            label={step === lastStep ? (proof ? 'إرسال الطلب والإيصال' : 'إرسال الطلب') : 'التالي'}
            iconEnd={step === lastStep ? Check : ArrowLeft}
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
            <Text variant="section">نوع نشاطك إيه؟</Text>
            <Text variant="ui" color="ink2">
              بيساعد العملاء يلاقوك في المكان الصح. تقدر تغيّره بعدين من إعدادات المتجر.
            </Text>
            <StoreTypePicker
              value={storeType}
              onChange={(type) => {
                if (type !== storeType) setCats([]);
                setStoreType(type);
              }}
              error={errors.storeType}
            />
          </>
        )}
        {step === 1 && (
          <>
            <Text variant="section">عرّفنا على ال{info.label}</Text>
            <TextField label={info.nameLabel} placeholder="مثال: معرض النور للأجهزة" icon={Store} value={name} onChangeText={setName} maxLength={60} error={errors.name} autoFocus />
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
        {step === 2 && (
          <>
            <Text variant="section">ال{info.label} بيبيع في أنهي أقسام؟</Text>
            <MultiSelect
              label="الأقسام"
              placeholder="اختار من 1 لـ 5 أقسام"
              sheetTitle={`أقسام ال${info.label}`}
              max={5}
              value={cats}
              onChange={setCats}
              loading={categories.isLoading}
              error={errors.cats}
              hint="بتظهر هنا الأقسام المناسبة لنوع نشاطك بس"
              options={(categories.data ?? []).filter((c) => c.isActive).map((c) => ({ value: c._id, label: c.nameAr }))}
            />
          </>
        )}
        {step === 3 && (
          <>
            <Text variant="section">إزاي العملاء يوصلولكم؟</Text>
            <TextField label="موبايل المتجر" placeholder="01012345678" icon={Phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr error={errors.phone} />
            <TextField label="واتساب" placeholder="01012345678" icon={MessageCircle} optional value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" ltr error={errors.whatsapp} />
            <TextField label="البريد الإلكتروني" placeholder="store@mail.com" icon={Mail} optional value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" ltr error={errors.email} />
            <TextField label="إنستجرام" icon={AtSign} optional value={instagram} onChangeText={setInstagram} autoCapitalize="none" ltr placeholder="@brand" />
            <TextField label="فيسبوك" icon={Globe} optional value={facebook} onChangeText={setFacebook} autoCapitalize="none" ltr placeholder="facebook.com/brand" />
            <TextField label="الموقع" icon={Globe} optional value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" ltr placeholder="brand.com" />
          </>
        )}
        {step === 4 && (
          <>
            <Text variant="section">اللوجو والغلاف</Text>
            <Text variant="ui" color="ink2">
              صور واضحة بتخلي العملاء يثقوا في متجرك أكتر. تقدر تضيفها بعدين كمان.
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
        {step === PLAN_STEP && (
          <>
            <Text variant="section">اختار باقتك</Text>
            <Text variant="ui" color="ink2">
              الباقة بتحدد عدد المنتجات اللي تقدر تنشرها. الدفع بـ InstaPay في الخطوة الجاية.
            </Text>
            <View style={[styles.toggle, { backgroundColor: t.c.sunken, borderRadius: t.radius.md }]} accessibilityRole="tablist">
              {(['MONTHLY', 'YEARLY'] as BillingPeriod[]).map((p) => (
                <Tap
                  key={p}
                  onPress={() => setPeriod(p)}
                  pressScale={1}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: period === p }}
                  style={[styles.toggleItem, { borderRadius: t.radius.sm + 2 }, period === p && { backgroundColor: t.c.surface }]}
                >
                  <Text variant="ui" weight={period === p ? 'bold' : 'medium'} color={period === p ? 'ink' : 'ink3'}>
                    {BILLING_LABEL[p]}
                  </Text>
                </Tap>
              ))}
            </View>
            {plans.isLoading ? (
              <>
                <Skeleton height={110} />
                <Skeleton height={110} />
              </>
            ) : (
              planList.map((p) => {
                const on = planId === p._id;
                const price = period === 'MONTHLY' ? p.priceMonthly : p.priceYearly;
                return (
                  <Tap
                    key={p._id}
                    onPress={() => {
                      haptic.tap();
                      setPlanId(p._id);
                      setErrors({});
                    }}
                    pressScale={0.99}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[styles.planOpt, { borderRadius: t.radius.lg, borderColor: on ? t.c.brand : t.c.line, borderWidth: on ? 2 : 1, backgroundColor: on ? t.c.accentSoft : t.c.surface }]}
                  >
                    <View style={[styles.radio, { borderColor: on ? t.c.accent : t.c.lineStrong }]}>{on && <View style={[styles.radioDot, { backgroundColor: t.c.accent }]} />}</View>
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{p.nameAr}</Text>
                      <Text variant="meta" color="ink2">
                        {planLimitsText(p.limits)}
                      </Text>
                    </View>
                    <View style={styles.planPrice}>
                      {price === 0 ? (
                        <Badge label="مجانية" tone="success" />
                      ) : (
                        <>
                          <Text variant="bodyStrong">{formatMoney(price)}</Text>
                          <Text variant="meta" color="ink3">
                            / {period === 'MONTHLY' ? 'شهر' : 'سنة'}
                          </Text>
                        </>
                      )}
                    </View>
                  </Tap>
                );
              })
            )}
            {errors.plan && (
              <Text variant="meta" color="danger">
                {errors.plan}
              </Text>
            )}
            {isFree && (
              <Text variant="meta" color="ink3">
                الباقة المجانية بتتفعل من غير دفع. تقدر تطوّرها في أي وقت من لوحة المتجر.
              </Text>
            )}
          </>
        )}
        {step === PAY_STEP && (
          <>
            <Text variant="section">الدفع بـ InstaPay</Text>
            <Card style={styles.payRow}>
              <View style={styles.flex}>
                <Text variant="meta" color="ink3">
                  المطلوب تحويله
                </Text>
                <Text variant="page" color="accent">
                  {formatMoney(amount)}
                </Text>
              </View>
              {plan && <Badge label={`${plan.nameAr} · ${BILLING_LABEL[period]}`} tone="neutral" />}
            </Card>
            {instructions.data ? (
              <Card style={styles.gap}>
                <Text variant="bodyStrong">حوّل على</Text>
                <CopyRow label="عنوان InstaPay" value={instructions.data.receiver} onCopy={() => copy(instructions.data!.receiver, 'العنوان')} />
                <Divider />
                <CopyRow label="باسم" value={instructions.data.receiverName} />
                <Divider />
                <CopyRow label="المبلغ" value={String(amount)} onCopy={() => copy(String(amount), 'المبلغ')} />
              </Card>
            ) : (
              <Skeleton height={160} />
            )}
            <Text variant="bodyStrong">حوّلت؟ ارفع الإيصال</Text>
            <ImageSlot label="صورة إيصال التحويل" purpose="PAYMENT_PROOF" value={proof} onChange={setProof} width="100%" height={170} />
            {proof && (
              <TextField label="رقم العملية (Reference)" placeholder="مثال: 123456789012" icon={Receipt} value={reference} onChangeText={setReference} autoCapitalize="characters" ltr error={errors.ref} hint="موجود في رسالة تأكيد InstaPay" />
            )}
            <Text variant="meta" color="ink3">
              لسه محوّلتش؟ ابعت الطلب دلوقتي، وهتلاقي بيانات التحويل ورفع الإيصال في الشاشة اللي بعدها وفي لوحة المتجر.
            </Text>
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

function CopyRow({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <View style={styles.payRow}>
      <View style={styles.flex}>
        <Text variant="meta" color="ink3">
          {label}
        </Text>
        <Text variant="bodyStrong" selectable>
          {value}
        </Text>
      </View>
      {onCopy && (
        <Tap onPress={onCopy} style={styles.copyBtn} accessibilityLabel={`نسخ ${label}`}>
          <Icon as={Copy} size={18} color="accent" />
          <Text variant="ui" color="accent">
            نسخ
          </Text>
        </Tap>
      )}
    </View>
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
  toggle: { flexDirection: 'row', padding: 4 },
  toggleItem: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  planOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  planPrice: { alignItems: 'flex-end' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 8 },
});
