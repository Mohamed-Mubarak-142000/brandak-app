import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleAlert, Copy, Receipt } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { qk, useInstructions, useMySubscriptions } from '@/api/queries';
import type { PaymentView } from '@/api/types';
import { ImageSlot, type UploadedImage } from '@/features/seller/image-slot';
import { formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Card, Divider, EmptyState, Icon, Illustration, Screen, Skeleton, Tap, Text, TextField, toast } from '@/ui';

/** InstaPay manual payment: copy the receiver, transfer, upload the receipt + reference. */
export default function Pay() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { subscriptionId } = useLocalSearchParams<{ subscriptionId: string }>();
  const subs = useMySubscriptions();
  const fallback = useInstructions();
  const [proof, setProof] = useState<UploadedImage | null>(null);
  const [ref, setRef] = useState('');
  const [sender, setSender] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sub = subs.data?.pending?._id === subscriptionId ? subs.data.pending : subs.data?.history.find((h) => h._id === subscriptionId);
  const payment = sub?.payment;
  const ins = subs.data?.pending?._id === subscriptionId ? subs.data.pending.instructions : fallback.data;
  const amount = payment?.amount ?? sub?.planSnapshot.price ?? 0;

  const submit = useMutation({
    mutationFn: () =>
      api.post<PaymentView>(`/brand/subscriptions/${subscriptionId}/payment-proofs`, {
        proofFileId: proof!.fileId,
        transactionReference: latinDigits(ref).trim(),
        senderName: sender.trim() || undefined,
        paidAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      haptic.success();
      qc.invalidateQueries({ queryKey: qk.mySubs });
      toast.success('اتبعت إثبات الدفع للمراجعة');
    },
    onError: () => haptic.error(),
  });

  const copy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    haptic.light();
    toast.success(`اتنسخ ${label}`);
  };

  const send = () => {
    const e: Record<string, string> = {};
    if (!proof) e.proof = 'ارفع صورة إيصال التحويل';
    const r = latinDigits(ref).trim();
    if (r.length < 4 || r.length > 64) e.ref = 'رقم العملية من 4 لـ 64 حرف';
    setErrors(e);
    if (!Object.keys(e).length) submit.mutate();
  };

  if (subs.isLoading)
    return (
      <Screen header={<AppBar title="الدفع بـ InstaPay" />}>
        <Skeleton height={200} />
        <Skeleton height={260} />
      </Screen>
    );

  const status = submit.isSuccess ? 'PENDING_REVIEW' : payment?.status;
  if (status === 'PENDING_REVIEW' || status === 'APPROVED')
    return (
      <Screen header={<AppBar title="الدفع" />} footer={<Button label="رجوع للوحة" onPress={() => router.dismissTo('/seller')} />}>
        <EmptyState
          art={status === 'APPROVED' ? 'success' : 'pending'}
          title={status === 'APPROVED' ? 'اشتراكك اتفعّل!' : 'بنراجع التحويل'}
          body={status === 'APPROVED' ? 'تقدر تنشر منتجاتك دلوقتي.' : 'عادةً خلال ساعات في أيام العمل. هيوصلك إشعار أول ما نخلص.'}
        />
      </Screen>
    );

  return (
    <Screen keyboard header={<AppBar title="الدفع بـ InstaPay" />} footer={<Button label="إرسال إثبات الدفع" loading={submit.isPending} onPress={send} />}>
      {payment?.status === 'REJECTED' && <Banner icon={CircleAlert} tone="danger" title="التحويل اللي فات اترفض" body={payment.rejectionReason ?? 'ارفع إيصال واضح ورقم العملية الصح.'} />}

      <Card style={styles.amount}>
        <Illustration name="trust" size={86} />
        <View style={styles.flex}>
          <Text variant="meta" color="ink3">
            المطلوب تحويله
          </Text>
          <Text variant="page" color="accent">
            {formatMoney(amount)}
          </Text>
          {sub && (
            <Text variant="meta" color="ink2">
              باقة {sub.planSnapshot.nameAr}
            </Text>
          )}
        </View>
      </Card>

      {ins && (
        <Card style={styles.gap}>
          <Text variant="bodyStrong">حوّل على</Text>
          <CopyRow label="عنوان InstaPay" value={ins.receiver} onCopy={() => copy(ins.receiver, 'العنوان')} />
          <Divider />
          <CopyRow label="باسم" value={ins.receiverName} />
          <Divider />
          <CopyRow label="المبلغ" value={String(amount)} onCopy={() => copy(String(amount), 'المبلغ')} />
          {ins.stepsAr.length > 0 && (
            <View style={styles.steps}>
              {ins.stepsAr.map((s, i) => (
                <View key={s} style={styles.step}>
                  <View style={[styles.stepNum, { backgroundColor: t.c.accentSoft }]}>
                    <Text variant="meta" weight="bold" color="accent">
                      {i + 1}
                    </Text>
                  </View>
                  <Text variant="ui" color="ink2" style={styles.flex}>
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      <View style={styles.gap}>
        <Text variant="bodyStrong">بعد التحويل</Text>
        <ImageSlot label="صورة إيصال التحويل" purpose="PAYMENT_PROOF" value={proof} onChange={setProof} width="100%" height={200} />
        {errors.proof && (
          <Text variant="meta" color="danger">
            {errors.proof}
          </Text>
        )}
        <TextField label="رقم العملية (Reference)" placeholder="مثال: 123456789012" icon={Receipt} value={ref} onChangeText={setRef} autoCapitalize="characters" ltr error={errors.ref} hint="موجود في رسالة تأكيد InstaPay" />
        <TextField label="اسم صاحب الحساب المحوِّل" placeholder="مثال: محمد أحمد" optional value={sender} onChangeText={setSender} />
      </View>
      {submit.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(submit.error)} />}
    </Screen>
  );
}

function CopyRow({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <View style={styles.copyRow}>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 12 },
  amount: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 8 },
  steps: { gap: 10, marginTop: 4 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
