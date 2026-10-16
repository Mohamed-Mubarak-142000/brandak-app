import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CircleAlert, User } from 'lucide-react-native';
import { useState } from 'react';

import { api, errorMessage } from '@/api/client';
import { AuthHeader } from '@/features/auth/auth-header';
import { latinDigits } from '@/lib/validation';
import { Banner, Button, Screen, TextField } from '@/ui';

export default function Forgot() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string>();

  const send = useMutation({
    mutationFn: (id: string) => api.anon('/auth/forgot-password', { identifier: id }),
    // The API always answers OK (no account enumeration), so we always move on.
    onSuccess: (_d, id) => router.push({ pathname: '/(auth)/reset', params: { identifier: id } }),
  });

  const submit = () => {
    const id = latinDigits(identifier.trim());
    if (!id) return setError('أدخل البريد الإلكتروني أو رقم الموبايل');
    setError(undefined);
    send.mutate(id);
  };

  return (
    <Screen keyboard header={<AuthHeader title="نسيت كلمة السر؟" subtitle="اكتب بريدك أو رقمك وهنبعتلك كود تعيد بيه كلمة السر." />}>
      {send.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(send.error)} />}
      <TextField
        label="البريد الإلكتروني أو الموبايل"
        icon={User}
        value={identifier}
        onChangeText={setIdentifier}
        error={error}
        autoCapitalize="none"
        keyboardType="email-address"
        ltr
        autoFocus
        onSubmitEditing={submit}
      />
      <Button label="ابعت الكود" loading={send.isPending} onPress={submit} />
    </Screen>
  );
}
