import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CircleAlert, Lock, Mail, Phone, User } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { api, ApiError, errorMessage } from '@/api/client';
import type { AuthResult } from '@/api/types';
import { completeSignIn } from '@/auth/use-auth';
import { AuthHeader } from '@/features/auth/auth-header';
import { PasswordMeter } from '@/features/auth/password-meter';
import { haptic } from '@/lib/haptics';
import { emailField, latinDigits, passwordField, phoneField } from '@/lib/validation';
import { Banner, Button, Screen, Tap, Text, TextField } from '@/ui';

const schema = z.object({
  name: z.string().trim().min(2, 'اكتب اسمك (حرفين على الأقل)').max(80),
  email: emailField,
  phone: phoneField,
  password: passwordField,
});
type Form = z.input<typeof schema>;

export default function Register() {
  const router = useRouter();
  const { control, handleSubmit, formState, watch, setError } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', password: '' },
  });

  const register = useMutation({
    mutationFn: (v: Form) =>
      api.anon<AuthResult>('/auth/register', {
        name: v.name.trim(),
        email: v.email.trim().toLowerCase(),
        phone: latinDigits(v.phone).replace(/[\s-]/g, ''),
        password: v.password,
      }),
    onSuccess: async (res) => {
      await completeSignIn(res);
      haptic.success();
      router.replace({ pathname: '/(auth)/verify', params: { channel: 'phone', welcome: '1' } });
    },
    onError: (e) => {
      haptic.error();
      if (e instanceof ApiError) {
        for (const d of e.details) if (d.field && d.field in schema.shape) setError(d.field as keyof Form, { message: e.message });
      }
    },
  });

  const submit = handleSubmit((v) => register.mutate(v));

  return (
    <Screen keyboard header={<AuthHeader close title="حساب جديد" subtitle="ثواني وتبدأ تتسوّق من أحلى البراندات المصرية." />}>
      {register.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(register.error)} />}
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField label="الاسم" icon={User} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={formState.errors.name?.message} autoComplete="name" textContentType="name" />
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
              ltr
              onSubmitEditing={() => submit()}
            />
            <PasswordMeter value={watch('password')} />
          </View>
        )}
      />
      <Text variant="meta" color="ink3">
        بإنشاء الحساب أنت موافق على شروط الاستخدام وسياسة الخصوصية الخاصة ببراندك.
      </Text>
      <Button label="إنشاء الحساب" loading={register.isPending} onPress={submit} />
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
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8 },
});
