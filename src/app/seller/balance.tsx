import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { CircleAlert, Clock, Copy, Percent, Receipt, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { qk, useCommission, useCommissionLedger, useInstructions } from '@/api/queries';
import type { LedgerEntry, Settlement } from '@/api/types';
import { ImageSlot, type UploadedImage } from '@/features/seller/image-slot';
import { formatDate, formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Card, Divider, ErrorState, Icon, Screen, Sheet, Skeleton, Tap, Text, TextField, toast } from '@/ui';

const TYPE_AR: Record<LedgerEntry['type'], string> = {
  COMMISSION: 'عمولة طلب',
  REVERSAL: 'عمولة مرتجعة',
  PAYMENT: 'سداد',
  ADJUSTMENT: 'تسوية',
};

/**
 * The store's account with the platform: 5% of every delivered order is owed here, paid by
 * InstaPay transfer. Owing too much (or for too long) pauses new orders until it is paid.
 */
export default function Balance() {
  const t = useTheme();
  const qc = useQueryClient();
  const status = useCommission();
  const ledger = useCommissionLedger();
  const ins = useInstructions();
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [proof, setProof] = useState<UploadedImage | null>(null);
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const s = status.data;
  const pct = s ? Math.round(s.commissionRate * 1000) / 10 : 5;

  const pay = useMutation({
    mutationFn: () =>
      api.post<Settlement>('/brand/commissions/settlements', {
        amount: Number(latinDigits(amount)),
        proofFileId: proof!.fileId,
        transactionReference: latinDigits(reference).trim(),
      }),
    onSuccess: () => {
      haptic.success();
      setPayOpen(false);
      setProof(null);
      setReference('');
      qc.invalidateQueries({ queryKey: qk.commission });
      toast.success('اتبعت الإيصال للمراجعة');
    },
    onError: () => haptic.error(),
  });

  const openPay = () => {
    setAmount(s ? String(s.balance) : '');
    setErrors({});
    setPayOpen(true);
  };

  const send = () => {
    const e: Record<string, string> = {};
    const n = Number(latinDigits(amount));
    if (!n || n < 1) e.amount = 'اكتب المبلغ اللي حوّلته';
    else if (s && n > s.balance) e.amount = `أقصى مبلغ ${formatMoney(s.balance)}`;
    if (!proof) e.proof = 'ارفع صورة إيصال التحويل';
    const r = latinDigits(reference).trim();
    if (r.length < 4 || r.length > 64) e.ref = 'رقم العملية من 4 لـ 64 حرف';
    setErrors(e);
    if (!Object.keys(e).length) pay.mutate();
  };

  const copy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    haptic.light();
    toast.success(`اتنسخ ${label}`);
  };

  return (
    <Screen
      header={<AppBar title="حسابي مع فاترينة" />}
      refreshControl={
        <RefreshControl
          refreshing={status.isRefetching}
          onRefresh={() => {
            status.refetch();
            ledger.refetch();
          }}
          tintColor={t.c.brand}
          colors={[t.c.brand]}
        />
      }
      footer={s && s.balance > 0 && !s.pendingSettlement ? <Button label={`ادفع ${formatMoney(s.balance)} بـ InstaPay`} icon={Wallet} onPress={openPay} /> : undefined}
    >
      {status.isLoading ? (
        <>
          <Skeleton height={150} />
          <Skeleton height={220} />
        </>
      ) : status.error || !s ? (
        <ErrorState error={status.error} onRetry={() => status.refetch()} />
      ) : (
        <>
          {s.blocked && (
            <Banner
              icon={CircleAlert}
              tone="danger"
              title="متجرك واقف عن استقبال الطلبات"
              body={`المستحق عدّى ${formatMoney(s.maxUnpaidBalance)} أو عدّى ميعاد السداد. ادفع وهيرجع يستقبل طلبات أول ما نراجع التحويل.`}
            />
          )}
          {s.pendingSettlement && (
            <Banner icon={Clock} title={`سداد ${formatMoney(s.pendingSettlement.amount)} تحت المراجعة`} body="عادةً خلال ساعات في أيام العمل." />
          )}

          <Card style={styles.summary}>
            <Text variant="meta" color="ink3">
              المستحق عليك لفاترينة
            </Text>
            <Text variant="display" color={s.balance > 0 ? (s.blocked ? 'danger' : 'accent') : 'success'}>
              {formatMoney(Math.max(0, s.balance))}
            </Text>
            {s.balance > 0 && s.dueBy ? (
              <Text variant="ui" color={s.blocked ? 'danger' : 'ink2'}>
                آخر ميعاد للسداد {formatDate(s.dueBy)}
              </Text>
            ) : (
              <Text variant="ui" color="ink2">
                مفيش عليك حاجة دلوقتي
              </Text>
            )}
          </Card>

          <Card style={styles.gap}>
            <View style={styles.inline}>
              <Icon as={Percent} color="accent" size={20} />
              <Text variant="bodyStrong">إزاي بنحسب</Text>
            </View>
            <Text variant="ui" color="ink2">
              {pct}% من قيمة المنتجات في كل طلب اتسلّم للعميل، من غير مصاريف الشحن. الطلب الملغي أو المرفوض مفيش عليه حاجة.
            </Text>
            <Text variant="ui" color="ink2">
              بتسدد كل {s.settlementDays} يوم بتحويل InstaPay. لو المستحق عدّى {formatMoney(s.maxUnpaidBalance)} أو عدّى الميعاد، المتجر بيقف عن استقبال طلبات جديدة لحد السداد.
            </Text>
          </Card>

          <View style={styles.gap}>
            <Text variant="section">كشف الحساب</Text>
            {ledger.isLoading ? (
              <Skeleton height={160} />
            ) : !ledger.data?.items.length ? (
              <Text variant="ui" color="ink3">
                لسه مفيش حركات. أول طلب يتسلّم هيظهر هنا.
              </Text>
            ) : (
              <Card>
                {ledger.data.items.map((e, i) => (
                  <View key={e._id}>
                    {i > 0 && <Divider />}
                    <View style={styles.row}>
                      <View style={styles.flex}>
                        <Text variant="ui" weight="semibold">
                          {TYPE_AR[e.type]}
                          {e.orderNumber ? ` · #${e.orderNumber}` : ''}
                        </Text>
                        <Text variant="meta" color="ink3">
                          {formatDate(e.createdAt)}
                          {e.base != null ? ` · ${pct}% من ${formatMoney(e.base)}` : ''}
                          {e.note && e.type !== 'COMMISSION' ? ` · ${e.note}` : ''}
                        </Text>
                      </View>
                      <Text variant="bodyStrong" color={e.amount < 0 ? 'success' : 'ink'}>
                        {e.amount < 0 ? '−' : '+'}
                        {formatMoney(Math.abs(e.amount))}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>
        </>
      )}

      <Sheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="سداد المستحق"
        footer={<Button label="إرسال الإيصال" loading={pay.isPending} onPress={send} />}
      >
        {ins.data && (
          <Card style={styles.gap}>
            <Text variant="bodyStrong">حوّل على</Text>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="meta" color="ink3">
                  عنوان InstaPay
                </Text>
                <Text variant="bodyStrong" selectable>
                  {ins.data.receiver}
                </Text>
              </View>
              <Tap onPress={() => copy(ins.data!.receiver, 'العنوان')} style={styles.copy} accessibilityLabel="نسخ العنوان">
                <Icon as={Copy} size={18} color="accent" />
                <Text variant="ui" color="accent">
                  نسخ
                </Text>
              </Tap>
            </View>
            <Text variant="meta" color="ink2">
              باسم {ins.data.receiverName}
            </Text>
          </Card>
        )}
        <TextField label="المبلغ اللي حوّلته (ج.م)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" ltr error={errors.amount} />
        <ImageSlot label="صورة إيصال التحويل" purpose="PAYMENT_PROOF" value={proof} onChange={setProof} width="100%" height={170} />
        {errors.proof && (
          <Text variant="meta" color="danger">
            {errors.proof}
          </Text>
        )}
        <TextField label="رقم العملية (Reference)" placeholder="مثال: 123456789012" icon={Receipt} value={reference} onChangeText={setReference} autoCapitalize="characters" ltr error={errors.ref} hint="موجود في رسالة تأكيد InstaPay" />
        {pay.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(pay.error)} />}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  summary: { alignItems: 'center', gap: 4, paddingVertical: 20 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 8 },
});
