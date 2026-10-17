import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleAlert, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { AuthHeader } from '@/features/auth/auth-header';
import { PasswordMeter } from '@/features/auth/password-meter';
import { haptic } from '@/lib/haptics';
import { passwordField } from '@/lib/validation';
import { Banner, Button, Screen, Text, TextField, toast } from '@/ui';
import { OtpInput } from '@/ui/otp-input';

export default function Reset() {
  const router = useRouter();
  const { identifier = '' } = useLocalSearchParams<{ identifier?: string }>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();

  const reset = useMutation({
    mutationFn: () => api.anon('/auth/reset-password', { identifier, code, newPassword: password }),
    onSuccess: () => {
      haptic.success();
      toast.success('تم تغيير كلمة السر. سجّل دخول بالكلمة الجديدة');
      router.dismissTo('/(auth)/login');
    },
    onError: () => haptic.error(),
  });

  const submit = () => {
    if (code.length < 6) return setError('اكتب الكود كامل');
    const parsed = passwordField.safeParse(password);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    setError(undefined);
    reset.mutate();
  };

  return (
    <Screen keyboard header={<AuthHeader title="كلمة سر جديدة" subtitle={`اكتب الكود اللي وصلك على ${identifier}`} />}>
      {reset.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(reset.error)} />}
      <View style={styles.otp}>
        <OtpInput value={code} onChange={setCode} error={reset.isError} />
      </View>
      <TextField label="كلمة السر الجديدة" placeholder="8 أحرف على الأقل، فيها حرف ورقم" icon={Lock} password value={password} onChangeText={setPassword} autoComplete="new-password" ltr error={error} />
      <PasswordMeter value={password} />
      <Text variant="meta" color="ink3">
        هنسجّل خروجك من كل الأجهزة التانية للأمان.
      </Text>
      <Button label="حفظ كلمة السر" loading={reset.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({ otp: { paddingVertical: 8 } });
