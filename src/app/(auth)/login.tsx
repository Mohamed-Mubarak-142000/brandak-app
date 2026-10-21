import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { CircleAlert, Lock, User } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { api, ApiError, errorMessage } from '@/api/client';
import type { AuthResult } from '@/api/types';
import { completeSignIn } from '@/auth/use-auth';
import { AuthHeader } from '@/features/auth/auth-header';
import { haptic } from '@/lib/haptics';
import { latinDigits } from '@/lib/validation';
import { Banner, Button, Screen, Tap, Text, TextField, toast } from '@/ui';

const schema = z.object({
  identifier: z.string().trim().min(1, 'أدخل البريد الإلكتروني أو رقم الموبايل'),
  password: z.string().min(1, 'أدخل كلمة السر'),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const router = useRouter();
  const { control, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { identifier: '', password: '' } });

  const login = useMutation({
    mutationFn: (v: Form) => api.anon<AuthResult>('/auth/login', { identifier: latinDigits(v.identifier.trim()), password: v.password }),
    onSuccess: async (res) => {
      await completeSignIn(res);
      haptic.success();
      toast.success(`أهلاً ${res.user.name.split(' ')[0]}، نوّرت فاترينة`);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    },
    onError: () => haptic.error(),
  });

  const err = login.error;
  const message =
    err instanceof ApiError && err.status === 401 ? 'البريد الإلكتروني أو الموبايل أو كلمة السر غير صحيحة' : err ? errorMessage(err) : null;

  return (
    <Screen keyboard header={<AuthHeader close title="أهلاً بيك تاني" subtitle="سجّل دخول عشان تكمل طلباتك ومفضلتك." />}>
      {message && <Banner icon={CircleAlert} tone="danger" title={message} />}
      <Controller
        control={control}
        name="identifier"
        render={({ field }) => (
          <TextField
            label="البريد الإلكتروني أو الموبايل"
            icon={User}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.identifier?.message}
            autoCapitalize="none"
            autoComplete="username"
            textContentType="username"
            keyboardType="email-address"
            placeholder="name@mail.com أو 010xxxxxxxx"
            ltr
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="كلمة السر" placeholder="اكتب كلمة السر"
            icon={Lock}
            password
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.password?.message}
            autoComplete="current-password"
            textContentType="password"
            ltr
            returnKeyType="go"
            onSubmitEditing={() => handleSubmit((v) => login.mutate(v))()}
          />
        )}
      />
      <Link href="/(auth)/forgot" asChild>
        <Tap pressScale={1} style={styles.forgot} accessibilityRole="link">
          <Text variant="ui" color="accent">
            نسيت كلمة السر؟
          </Text>
        </Tap>
      </Link>
      <Button label="تسجيل الدخول" loading={login.isPending} onPress={handleSubmit((v) => login.mutate(v))} />
      <View style={styles.row}>
        <Text variant="ui" color="ink2">
          أول مرة على فاترينة؟
        </Text>
        <Tap pressScale={1} hitSlop={10} onPress={() => router.replace('/(auth)/register')}>
          <Text variant="ui" weight="bold" color="accent">
            أنشئ حساب
          </Text>
        </Tap>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-start', height: 36, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8 },
});
