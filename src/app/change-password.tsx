import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CircleAlert, Lock } from 'lucide-react-native';
import { useState } from 'react';

import { api, errorMessage } from '@/api/client';
import { PasswordMeter } from '@/features/auth/password-meter';
import { haptic } from '@/lib/haptics';
import { passwordField } from '@/lib/validation';
import { AppBar, Banner, Button, Screen, Text, TextField, toast } from '@/ui';

export default function ChangePassword() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string>();

  const change = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword: current, newPassword: next }),
    onSuccess: () => {
      haptic.success();
      toast.success('اتغيرت كلمة السر');
      router.back();
    },
    onError: () => haptic.error(),
  });

  const submit = () => {
    if (!current) return setError('اكتب كلمة السر الحالية');
    const p = passwordField.safeParse(next);
    if (!p.success) return setError(p.error.issues[0]?.message);
    setError(undefined);
    change.mutate();
  };

  return (
    <Screen keyboard header={<AppBar title="تغيير كلمة السر" />}>
      {change.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(change.error)} />}
      <TextField label="كلمة السر الحالية" placeholder="اكتب كلمة السر الحالية" icon={Lock} password value={current} onChangeText={setCurrent} autoComplete="current-password" ltr />
      <TextField label="كلمة السر الجديدة" placeholder="8 أحرف على الأقل، فيها حرف ورقم" icon={Lock} password value={next} onChangeText={setNext} autoComplete="new-password" ltr error={error} />
      <PasswordMeter value={next} />
      <Text variant="meta" color="ink3">
        هنسجّل خروجك من الأجهزة التانية، والجهاز ده هيفضل مسجّل.
      </Text>
      <Button label="حفظ" loading={change.isPending} onPress={submit} />
    </Screen>
  );
}
