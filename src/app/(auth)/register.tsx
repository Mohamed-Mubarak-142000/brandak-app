import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Briefcase, Check, CircleAlert, Lock, Mail, Phone, ShoppingBag, Store, User } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { z } from 'zod';

import { api, ApiError, errorMessage } from '@/api/client';
import { qk, useCategories } from '@/api/queries';
import type { AuthResult, OwnerBrand, StoreType } from '@/api/types';
import { completeSignIn, meKey } from '@/auth/use-auth';
import { AuthHeader } from '@/features/auth/auth-header';
import { PasswordMeter } from '@/features/auth/password-meter';
import { STORE_TYPES, storeTypeInfo } from '@/features/catalog/store-types';
import { haptic } from '@/lib/haptics';
import { emailField, latinDigits, passwordField, phoneField } from '@/lib/validation';
import { useTheme } from '@/theme';
import { Banner, Button, Chip, Divider, Icon, Screen, Select, Skeleton, Tap, Text, TextField, toast } from '@/ui';

const schema = z.object({
  name: z.string().trim().min(2, 'اكتب اسمك (حرفين على الأقل)').max(80),
  email: emailField,
  phone: phoneField,
  password: passwordField,
});
type Form = z.input<typeof schema>;
type Kind = 'buyer' | 'business';

/** Placeholder for the store name, per type — a realistic Egyptian example. */
const NAME_EXAMPLE: Record<StoreType, string> = {
  BRAND: 'مثال: نور هاند ميد',
  SHOWROOM: 'مثال: معرض النور للأجهزة',
  WAREHOUSE: 'مثال: مخازن الأمل للجملة',
  SHOP: 'مثال: محل السعادة',
};

/**
 * One sign-up screen for everyone. Buyers fill four fields; business owners also pick their
 * store type (dropdown) and the categories offered to that type, and one tap creates the account
 * and sends the store for review.
 */
export default function Register() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { intent } = useLocalSearchParams<{ intent?: 'seller' }>();
  const [kind, setKind] = useState<Kind>(intent === 'seller' ? 'business' : 'buyer');
  const business = kind === 'business';

  const [storeType, setStoreType] = useState<StoreType | null>(null);
  const [storeName, setStoreName] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [bizErrors, setBizErrors] = useState<Record<string, string>>({});
  const categories = useCategories(storeType);
  const info = storeType ? storeTypeInfo(storeType) : null;

  const { control, handleSubmit, formState, watch, setError } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', password: '' },
  });

  const register = useMutation({
    mutationFn: async (v: Form) => {
      const phone = latinDigits(v.phone).replace(/[\s-]/g, '');
      const res = await api.anon<AuthResult>('/auth/register', {
        name: v.name.trim(),
        email: v.email.trim().toLowerCase(),
        phone,
        password: v.password,
      });
      await completeSignIn(res);
      if (!business) return { storeSent: false };
      try {
        const brand = await api.post<OwnerBrand>('/brand-applications', {
          storeType,
          name: storeName.trim(),
          categoryIds: cats,
          contact: { phone },
        });
        qc.setQueryData(qk.myBrand, brand);
        await qc.invalidateQueries({ queryKey: meKey });
        return { storeSent: true };
      } catch (e) {
        // The account exists already; the store can be finished from the wizard.
        toast.error(`الحساب اتعمل، بس طلب المتجر متبعتش: ${errorMessage(e)}`);
        return { storeSent: false, storeFailed: true };
      }
    },
    onSuccess: (r) => {
      haptic.success();
      if (r.storeFailed) {
        router.replace({ pathname: '/seller/apply', params: { storeType: storeType ?? undefined, name: storeName.trim() } });
        return;
      }
      router.replace({ pathname: '/(auth)/verify', params: { channel: 'phone', welcome: '1', ...(business ? { intent: 'seller' } : {}) } });
    },
    onError: (e) => {
      haptic.error();
      if (e instanceof ApiError) {
        for (const d of e.details) if (d.field && d.field in schema.shape) setError(d.field as keyof Form, { message: e.message });
      }
    },
  });

  const validateBusiness = () => {
    if (!business) return true;
    const e: Record<string, string> = {};
    if (!storeType) e.storeType = 'اختار نوع نشاطك';
    if (storeName.trim().length < 2) e.storeName = `اكتب ${info?.nameLabel ?? 'اسم المتجر'} (حرفين على الأقل)`;
    if (!cats.length) e.cats = 'اختار قسم واحد على الأقل';
    setBizErrors(e);
    return !Object.keys(e).length;
  };

  const submit = handleSubmit(
    (v) => {
      if (!validateBusiness()) return haptic.warning();
      register.mutate(v);
    },
    () => validateBusiness(),
  );

  const pickType = (type: StoreType) => {
    if (type !== storeType) setCats([]);
    setStoreType(type);
    setBizErrors((e) => ({ ...e, storeType: '' }));
  };

  return (
    <Screen
      keyboard
      header={
        <AuthHeader
          close
          title={business ? 'حساب بيزنس' : 'حساب جديد'}
          subtitle={business ? 'حسابك وبيانات نشاطك في خطوة واحدة.' : 'ثواني وتبدأ تتسوّق من كل المتاجر.'}
        />
      }
    >
      {/* Buyer or business owner — visible from the start. */}
      <View style={[styles.segment, { backgroundColor: t.c.sunken, borderRadius: t.radius.md }]} accessibilityRole="tablist">
        {(
          [
            { key: 'buyer', label: 'مشتري', icon: ShoppingBag },
            { key: 'business', label: 'صاحب بيزنس', icon: Briefcase },
          ] as const
        ).map((o) => {
          const on = kind === o.key;
          return (
            <Tap
              key={o.key}
              onPress={() => {
                haptic.tap();
                setKind(o.key);
              }}
              pressScale={1}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.segItem, { borderRadius: t.radius.sm + 2 }, on && { backgroundColor: t.c.surface, shadowColor: t.c.shadow, shadowOpacity: 0.08, shadowRadius: 6, elevation: 1 }]}
            >
              <Icon as={o.icon} size={18} color={on ? 'accent' : 'ink3'} />
              <Text variant="ui" weight={on ? 'bold' : 'medium'} color={on ? 'ink' : 'ink3'}>
                {o.label}
              </Text>
            </Tap>
          );
        })}
      </View>

      {register.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(register.error)} />}

      <Text variant="bodyStrong">{business ? 'بياناتك الشخصية' : 'بياناتك'}</Text>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            label="الاسم"
            icon={User}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.name?.message}
            autoComplete="name"
            textContentType="name"
            placeholder="مثال: محمد أحمد"
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <TextField
            label="رقم الموبايل"
            icon={Phone}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.phone?.message}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="01012345678"
            hint="هنبعتلك كود تأكيد على الرقم ده"
            ltr
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="البريد الإلكتروني"
            icon={Mail}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="name@mail.com"
            ltr
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <View style={styles.gap}>
            <TextField
              label="كلمة السر"
              icon={Lock}
              password
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.password?.message}
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="8 أحرف على الأقل، فيها حرف ورقم"
              ltr
            />
            <PasswordMeter value={watch('password')} />
          </View>
        )}
      />

      {business && (
        <Animated.View entering={FadeInDown.duration(260)} style={styles.bizBlock}>
          <Divider />
          <View style={styles.inline}>
            <Icon as={Store} color="accent" />
            <Text variant="bodyStrong">بيانات النشاط</Text>
          </View>
          <Select
            label="نوع النشاط"
            placeholder="اختار: براند، معرض، مخزن، محل..."
            sheetTitle="نوع نشاطك إيه؟"
            value={storeType}
            onChange={pickType}
            error={bizErrors.storeType || undefined}
            options={STORE_TYPES.map((s) => ({ value: s.type, label: s.label, description: s.description, icon: s.icon }))}
          />
          {storeType && (
            <>
              <TextField
                label={info!.nameLabel}
                icon={info!.icon}
                value={storeName}
                onChangeText={(v) => {
                  setStoreName(v);
                  if (bizErrors.storeName) setBizErrors((e) => ({ ...e, storeName: '' }));
                }}
                maxLength={60}
                placeholder={NAME_EXAMPLE[storeType]}
                error={bizErrors.storeName || undefined}
              />
              <View style={styles.gap}>
                <Text variant="ui" color={bizErrors.cats ? 'danger' : 'ink2'}>
                  {bizErrors.cats || `ال${info!.label} بيبيع إيه؟ اختار من 1 لـ 5 أقسام (${cats.length}/5)`}
                </Text>
                <View style={styles.wrap}>
                  {categories.isLoading
                    ? [0, 1, 2, 3].map((i) => <Skeleton key={i} width={100} height={40} radius={20} />)
                    : (categories.data ?? []).map((c) => {
                        const on = cats.includes(c._id);
                        return (
                          <Chip
                            key={c._id}
                            label={c.nameAr}
                            selected={on}
                            icon={on ? Check : undefined}
                            disabled={!on && cats.length >= 5}
                            onPress={() => {
                              haptic.tap();
                              setCats((x) => (on ? x.filter((i) => i !== c._id) : [...x, c._id]));
                              if (bizErrors.cats) setBizErrors((e) => ({ ...e, cats: '' }));
                            }}
                          />
                        );
                      })}
                </View>
              </View>
            </>
          )}
          <Text variant="meta" color="ink3">
            فريق دكاكين بيراجع المتجر خلال يوم عمل. اللوجو والصور والسوشيال تقدر تضيفهم بعدين من لوحة المتجر.
          </Text>
        </Animated.View>
      )}

      <Text variant="meta" color="ink3">
        بإنشاء الحساب أنت موافق على شروط الاستخدام وسياسة الخصوصية الخاصة بدكاكين.
      </Text>
      <Button label={business ? 'إنشاء الحساب والمتجر' : 'إنشاء الحساب'} loading={register.isPending} onPress={() => submit()} />
      <View style={styles.row}>
        <Text variant="ui" color="ink2">
          عندك حساب؟
        </Text>
        <Tap pressScale={1} hitSlop={10} onPress={() => router.replace('/(auth)/login')}>
          <Text variant="ui" weight="bold" color="accent">
            سجّل دخول
          </Text>
        </Tap>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  segment: { flexDirection: 'row', padding: 4 },
  segItem: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bizBlock: { gap: 14 },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8 },
});
