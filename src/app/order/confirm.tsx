import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleAlert, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import type { OrderDetail } from '@/api/types';
import { useMe } from '@/auth/use-auth';
import { haptic } from '@/lib/haptics';
import { AppBar, Banner, Button, Icon, Screen, Tap, Text, toast } from '@/ui';
import { OtpInput } from '@/ui/otp-input';

const COOLDOWN = 60;

/**
 * New customers (and those who refused parcels before) confirm a cash order with a code sent
 * to their email. One code confirms every order they're holding, from any store.
 */
export default function ConfirmOrder() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(COOLDOWN);

  const confirm = useMutation({
    mutationFn: (c: string) => api.post<OrderDetail[]>('/orders/me/confirm', { code: c }),
    onSuccess: (orders) => {
      haptic.success();
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success(orders.length > 1 ? `اتأكد ${orders.length} طلبات واتبعتوا للمتاجر` : 'اتأكد طلبك واتبعت للمتجر');
      const target = id ?? orders[0]?.id;
      if (target) router.replace({ pathname: '/order/[id]', params: { id: target } });
      else router.replace('/(tabs)/orders');
    },
    onError: () => {
      haptic.error();
      setCode('');
    },
  });

  const resend = useMutation({
    mutationFn: () => api.post('/orders/me/confirm/resend'),
    onSuccess: () => {
      setLeft(COOLDOWN);
      toast.success('بعتنا كود جديد');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  useEffect(() => {
    if (code.length === 6 && !confirm.isPending) confirm.mutate(code);
  }, [code, confirm]);

  return (
    <Screen keyboard header={<AppBar title="أكّد طلبك" />}>
      <View style={styles.head}>
        <Icon as={ShieldCheck} size={44} color="accent" />
        <Text variant="section" align="center">
          خطوة واحدة وطلبك يوصل للمتجر
        </Text>
        <Text variant="ui" color="ink2" align="center">
          بعتنا كود من 6 أرقام على {me.data?.email ?? 'إيميلك'}. ده بيحمي المتاجر من الطلبات الوهمية، وبيتطلب بس في أول طلب ليك.
        </Text>
      </View>
      <View style={styles.otp}>
        <OtpInput value={code} onChange={setCode} error={confirm.isError} />
      </View>
      {confirm.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(confirm.error)} />}
      <Button label="تأكيد الطلب" loading={confirm.isPending} disabled={code.length < 6} onPress={() => confirm.mutate(code)} />
      <View style={styles.row}>
        {left > 0 ? (
          <Text variant="ui" color="ink3">
            تقدر تطلب كود جديد بعد {left} ثانية
          </Text>
        ) : (
          <Tap pressScale={1} hitSlop={10} onPress={() => resend.mutate()} disabled={resend.isPending}>
            <Text variant="ui" weight="bold" color="accent">
              {resend.isPending ? 'جاري الإرسال...' : 'ابعت الكود تاني'}
            </Text>
          </Tap>
        )}
      </View>
      <Text variant="meta" color="ink3" align="center">
        لو مأكدتش خلال 24 ساعة، الطلب بيتلغي تلقائياً.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 8, paddingTop: 8 },
  otp: { paddingVertical: 12 },
  row: { alignItems: 'center', paddingVertical: 4 },
});
