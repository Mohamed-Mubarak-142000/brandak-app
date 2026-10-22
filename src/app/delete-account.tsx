import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CircleAlert, Lock, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Alert } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { useSession } from '@/auth/session';
import { queryClient } from '@/api/query-client';
import { haptic } from '@/lib/haptics';
import { AppBar, Banner, Button, Card, Screen, Text, TextField, toast } from '@/ui';

const GONE = [
  'اسمك وإيميلك ورقم موبايلك وكلمة السر',
  'عناوينك وسلتك والمفضلة وتنبيهات الأسعار',
  'رصيد نقاطك والمتاجر اللي بتتابعها',
  'بياناتك الشخصية جوه طلباتك القديمة',
];

/** Deletes the account (required by Google Play), after the password confirms it. */
export default function DeleteAccount() {
  const router = useRouter();
  const [password, setPassword] = useState('');

  const remove = useMutation({
    mutationFn: () => api.post('/auth/delete-account', { password }),
    onSuccess: async () => {
      haptic.success();
      // The API already ended every session; forget this device's too.
      await useSession.getState().signOut();
      queryClient.clear();
      toast.success('اتمسح حسابك. نتمنى نشوفك تاني');
      router.replace('/(tabs)');
    },
    onError: () => haptic.error(),
  });

  const confirm = () =>
    Alert.alert('تمسح حسابك نهائياً؟', 'مش هتقدر ترجّعه تاني.', [
      { text: 'رجوع', style: 'cancel' },
      { text: 'احذف حسابي', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  return (
    <Screen keyboard header={<AppBar title="حذف الحساب" />}>
      <Banner icon={TriangleAlert} tone="danger" title="الحذف نهائي" body="لو حذفت حسابك، مش هنقدر نرجّعه، وهتحتاج تعمل حساب جديد." />
      <Card style={{ gap: 6 }}>
        <Text variant="ui" weight="semibold">
          اللي هيتمسح:
        </Text>
        {GONE.map((g) => (
          <Text key={g} variant="ui" color="ink2">
            • {g}
          </Text>
        ))}
        <Text variant="meta" color="ink3">
          المتاجر بتحتفظ بسجل الطلبات (المنتجات والمبالغ) من غير بياناتك، والتقييمات بتفضل باسم «مستخدم محذوف».
        </Text>
      </Card>
      {remove.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(remove.error)} />}
      <TextField label="كلمة السر للتأكيد" icon={Lock} password value={password} onChangeText={setPassword} autoComplete="current-password" ltr />
      <Button label="احذف حسابي" variant="danger" loading={remove.isPending} disabled={!password} onPress={confirm} />
      <Button label="رجوع" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
