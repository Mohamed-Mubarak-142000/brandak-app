import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TicketPercent } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { useSellerCoupons } from '@/api/queries';
import type { Coupon } from '@/api/types';
import { formatDate, formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { AppBar, Badge, Banner, Button, Card, Chip, EmptyState, ErrorState, Icon, IconButton, Screen, Sheet, Skeleton, Text, TextField, toast } from '@/ui';

const KEY = ['seller', 'coupons'];
const DAYS = [3, 7, 14, 30];

const state = (c: Coupon) => {
  const now = Date.now();
  if (!c.isActive) return { label: 'موقوف', tone: 'neutral' as const };
  if (new Date(c.startsAt).getTime() > now) return { label: 'لسه مابدأش', tone: 'warning' as const };
  if (new Date(c.endsAt).getTime() <= now) return { label: 'انتهى', tone: 'neutral' as const };
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { label: 'خلص', tone: 'neutral' as const };
  return { label: 'شغال', tone: 'success' as const };
};

/** Discount codes the store shares on its pages and with its customers. The store pays the discount. */
export default function Coupons() {
  const t = useTheme();
  const qc = useQueryClient();
  const coupons = useSellerCoupons();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState('');
  const [minSubtotal, setMinSubtotal] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [days, setDays] = useState(7);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: () =>
      api.post<Coupon>('/brand/coupons', {
        code: code.trim(),
        type,
        value: Number(latinDigits(value)),
        minSubtotal: minSubtotal ? Number(latinDigits(minSubtotal)) : 0,
        maxUses: maxUses ? Number(latinDigits(maxUses)) : null,
        endsAt: new Date(Date.now() + days * 86_400_000).toISOString(),
      }),
    onSuccess: () => {
      haptic.success();
      qc.invalidateQueries({ queryKey: KEY });
      setOpen(false);
      setCode('');
      setValue('');
      setMinSubtotal('');
      setMaxUses('');
      toast.success('الكود جاهز، شاركه مع عملائك');
    },
    onError: (e) => {
      haptic.error();
      toast.error(errorMessage(e));
    },
  });

  const toggle = useMutation({
    mutationFn: (c: Coupon) => api.patch<Coupon>(`/brand/coupons/${c._id}`, { isActive: !c.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = () => {
    const e: Record<string, string> = {};
    if (!/^[A-Za-z0-9_-]{3,20}$/.test(code.trim())) e.code = 'من 3 لـ 20 حرف إنجليزي أو رقم';
    const v = Number(latinDigits(value));
    if (!v || v < 1) e.value = 'اكتب قيمة الخصم';
    else if (type === 'PERCENT' && v > 90) e.value = 'أقصى نسبة 90%';
    setErrors(e);
    if (!Object.keys(e).length) create.mutate();
  };

  return (
    <Screen
      header={<AppBar title="كوبونات الخصم" end={<IconButton icon={Plus} label="كوبون جديد" background="accent" color="onAccent" onPress={() => setOpen(true)} />} />}
    >
      <Banner icon={TicketPercent} title="شارك الكود على صفحتك" body="العميل بيكتبه وقت الطلب. الخصم من حسابك، والعمولة بتتحسب على السعر بعد الخصم." />
      {coupons.isLoading ? (
        <Skeleton height={140} />
      ) : coupons.error ? (
        <ErrorState error={coupons.error} onRetry={() => coupons.refetch()} />
      ) : !coupons.data?.length ? (
        <EmptyState art="box" title="مفيش كوبونات لسه" body="اعمل كود خصم وشاركه مع متابعينك عشان يطلبوا." action="كوبون جديد" onAction={() => setOpen(true)} />
      ) : (
        coupons.data.map((c) => {
          const s = state(c);
          return (
            <Card key={c._id} style={styles.gap}>
              <View style={styles.row}>
                <Text variant="section" selectable style={styles.flex}>
                  {c.code}
                </Text>
                <Badge label={s.label} tone={s.tone} />
                <Switch value={c.isActive} onValueChange={() => toggle.mutate(c)} trackColor={{ true: t.c.accent, false: t.c.lineStrong }} thumbColor="#fff" accessibilityLabel={`تشغيل ${c.code}`} />
              </View>
              <Text variant="ui" weight="semibold">
                {c.type === 'PERCENT' ? `خصم ${c.value}%` : `خصم ${formatMoney(c.value)}`}
                {c.minSubtotal ? ` على طلب ${formatMoney(c.minSubtotal)} أو أكتر` : ''}
              </Text>
              <Text variant="meta" color="ink3">
                استُخدم {c.usedCount}
                {c.maxUses != null ? ` من ${c.maxUses}` : ''} مرة · لحد {formatDate(c.endsAt)}
              </Text>
            </Card>
          );
        })
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="كوبون جديد" footer={<Button label="إنشاء الكوبون" loading={create.isPending} onPress={submit} />}>
        <TextField label="الكود" placeholder="SAVE10" value={code} onChangeText={setCode} autoCapitalize="characters" ltr error={errors.code} />
        <View style={styles.row}>
          <Chip label="نسبة %" selected={type === 'PERCENT'} onPress={() => setType('PERCENT')} />
          <Chip label="مبلغ ثابت" selected={type === 'FIXED'} onPress={() => setType('FIXED')} />
        </View>
        <TextField label={type === 'PERCENT' ? 'نسبة الخصم (%)' : 'قيمة الخصم (ج.م)'} placeholder={type === 'PERCENT' ? '10' : '50'} value={value} onChangeText={setValue} keyboardType="decimal-pad" ltr error={errors.value} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="أقل قيمة طلب" optional placeholder="300" value={minSubtotal} onChangeText={setMinSubtotal} keyboardType="decimal-pad" ltr />
          </View>
          <View style={styles.flex}>
            <TextField label="عدد مرات الاستخدام" optional placeholder="بلا حد" value={maxUses} onChangeText={setMaxUses} keyboardType="number-pad" ltr />
          </View>
        </View>
        <Text variant="ui" color="ink2">
          صالح لمدة
        </Text>
        <View style={styles.row}>
          {DAYS.map((d) => (
            <Chip key={d} label={`${d} يوم`} selected={days === d} onPress={() => setDays(d)} />
          ))}
        </View>
        <View style={styles.row}>
          <Icon as={TicketPercent} size={16} color="ink3" />
          <Text variant="meta" color="ink3" style={styles.flex}>
            كل عميل يقدر يستخدمه مرة واحدة.
          </Text>
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
});
