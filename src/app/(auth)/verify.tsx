import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleAlert } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, ApiError, errorMessage } from '@/api/client';
import { queryClient } from '@/api/query-client';
import { meKey, useMe } from '@/auth/use-auth';
import { AuthHeader } from '@/features/auth/auth-header';
import { formatPhone } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { Banner, Button, Screen, Tap, Text, toast } from '@/ui';
import { OtpInput } from '@/ui/otp-input';

const COOLDOWN = 60;

/** Confirms the phone (or email) with the 6-digit code. Reachable after sign-up and from the account banner. */
export default function Verify() {
  const router = useRouter();
  const { channel = 'phone', welcome } = useLocalSearchParams<{ channel?: 'phone' | 'email'; welcome?: string }>();
  const me = useMe();
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(0);
  const sent = useRef(false);

  const request = useMutation({
    mutationFn: () => api.post('/auth/verify-contact/request', { channel }),
    onSuccess: () => setLeft(COOLDOWN),
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'ALREADY_VERIFIED') done();
    },
  });

  const verify = useMutation({
    mutationFn: (c: string) => api.post('/auth/verify-contact', { channel, code: c }),
    onSuccess: async () => {
      haptic.success();
      await queryClient.invalidateQueries({ queryKey: meKey });
      toast.success(channel === 'phone' ? 'تم تأكيد رقم الموبايل' : 'تم تأكيد البريد الإلكتروني');
      done();
    },
    onError: () => {
      haptic.error();
      setCode('');
    },
  });

  function done() {
    if (welcome) router.replace('/(tabs)');
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    request.mutate();
  }, [request]);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  useEffect(() => {
    if (code.length === 6 && !verify.isPending) verify.mutate(code);
  }, [code, verify]);

  const target = channel === 'phone' ? formatPhone(me.data?.phone) : me.data?.email;

  return (
    <Screen
      keyboard
      header={
        <AuthHeader
          close={!!welcome}
          title={channel === 'phone' ? 'أكّد رقم موبايلك' : 'أكّد بريدك الإلكتروني'}
          subtitle={`بعتنا كود من 6 أرقام على ${target ?? '...'}`}
        />
      }
    >
      <View style={styles.otp}>
        <OtpInput value={code} onChange={setCode} error={verify.isError} />
      </View>
      {verify.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(verify.error)} />}
      {request.error && !(request.error instanceof ApiError && request.error.code === 'ALREADY_VERIFIED') && (
        <Banner icon={CircleAlert} tone="warning" title={errorMessage(request.error)} />
      )}
      <Button label="تأكيد" loading={verify.isPending} disabled={code.length < 6} onPress={() => verify.mutate(code)} />
      <View style={styles.row}>
        {left > 0 ? (
          <Text variant="ui" color="ink3">
            تقدر تطلب كود جديد بعد {left} ثانية
          </Text>
        ) : (
          <Tap pressScale={1} hitSlop={10} onPress={() => request.mutate()} disabled={request.isPending}>
            <Text variant="ui" weight="bold" color="accent">
              {request.isPending ? 'جاري الإرسال...' : 'ابعت الكود تاني'}
            </Text>
          </Tap>
        )}
      </View>
      {welcome && (
        <Tap pressScale={1} style={styles.later} onPress={() => router.replace('/(tabs)')}>
          <Text variant="ui" color="ink2">
            هأكّد بعدين
          </Text>
        </Tap>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  otp: { paddingVertical: 12 },
  row: { alignItems: 'center', paddingVertical: 4 },
  later: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
