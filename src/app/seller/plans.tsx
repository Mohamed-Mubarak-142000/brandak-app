import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Check, CircleAlert, Clock, Crown } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { qk, useMySubscriptions, usePlans } from '@/api/queries';
import type { BillingPeriod, Plan, SubscriptionRequestResult } from '@/api/types';
import { BILLING_LABEL, formatDate, formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Badge, Banner, Button, Card, ErrorState, Icon, Screen, Skeleton, Tap, Text } from '@/ui';

const PAY_STATUS_AR = { AWAITING_PROOF: 'مستني إثبات الدفع', PENDING_REVIEW: 'تحت المراجعة', APPROVED: 'اتقبل', REJECTED: 'اترفض', CANCELLED: 'اتلغى' } as const;

export default function Plans() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const plans = usePlans();
  const subs = useMySubscriptions();
  const [period, setPeriod] = useState<BillingPeriod>('MONTHLY');
  const [chosen, setChosen] = useState<string | null>(null);

  const subscribe = useMutation({
    mutationFn: (planId: string) => api.post<SubscriptionRequestResult>('/brand/subscriptions', { planId, billingPeriod: period }),
    onSuccess: (res) => {
      haptic.success();
      qc.invalidateQueries({ queryKey: qk.mySubs });
      router.push({ pathname: '/seller/pay/[subscriptionId]', params: { subscriptionId: res.subscription._id } });
    },
    onError: () => haptic.error(),
  });

  const pending = subs.data?.pending;
  const current = subs.data?.current;
  const list = (plans.data ?? []).filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const maxSave = Math.max(0, ...list.map((p) => Math.round((1 - p.priceYearly / (p.priceMonthly * 12)) * 100)));

  return (
    <Screen header={<AppBar title="الباقات" />}>
      {current && (
        <Card style={styles.current}>
          <Icon as={Crown} color="accent" />
          <View style={styles.flex}>
            <Text variant="ui" weight="bold">
              باقتك الحالية: {current.planSnapshot.nameAr}
            </Text>
            <Text variant="meta" color="ink3">
              {BILLING_LABEL[current.billingPeriod]} · لحد {formatDate(subs.data?.paidUntil ?? current.endsAt)}
            </Text>
          </View>
        </Card>
      )}
      {pending && (
        <Banner
          icon={Clock}
          tone={pending.payment?.status === 'REJECTED' ? 'danger' : 'warning'}
          title={`طلب ${pending.planSnapshot.nameAr}: ${PAY_STATUS_AR[pending.payment?.status ?? 'AWAITING_PROOF']}`}
          body={pending.payment?.rejectionReason ?? undefined}
          action={pending.payment?.status === 'PENDING_REVIEW' ? undefined : 'كمّل الدفع'}
          onAction={() => router.push({ pathname: '/seller/pay/[subscriptionId]', params: { subscriptionId: pending._id } })}
        />
      )}

      <View style={[styles.toggle, { backgroundColor: t.c.sunken, borderRadius: t.radius.md }]} accessibilityRole="tablist">
        {(['MONTHLY', 'YEARLY'] as BillingPeriod[]).map((p) => (
          <Tap
            key={p}
            onPress={() => setPeriod(p)}
            pressScale={1}
            accessibilityRole="tab"
            accessibilityState={{ selected: period === p }}
            style={[styles.toggleItem, { borderRadius: t.radius.sm + 2 }, period === p && { backgroundColor: t.c.surface }]}
          >
            <Text variant="ui" weight={period === p ? 'bold' : 'medium'} color={period === p ? 'ink' : 'ink3'}>
              {BILLING_LABEL[p]}
            </Text>
            {p === 'YEARLY' && maxSave > 0 && <Badge label={`وفّر لحد ${maxSave}%`} tone="success" />}
          </Tap>
        ))}
      </View>

      {plans.isLoading ? (
        <>
          <Skeleton height={220} radius={16} />
          <Skeleton height={220} radius={16} />
        </>
      ) : plans.error ? (
        <ErrorState error={plans.error} onRetry={() => plans.refetch()} />
      ) : (
        list.map((p, i) => (
          <PlanCard
            key={p._id}
            plan={p}
            period={period}
            featured={i === Math.min(1, list.length - 1)}
            current={current?.planSnapshot.code === p.code}
            loading={subscribe.isPending && chosen === p._id}
            disabled={!!pending && pending.payment?.status === 'PENDING_REVIEW'}
            onChoose={() => {
              setChosen(p._id);
              subscribe.mutate(p._id);
            }}
          />
        ))
      )}
      {subscribe.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(subscribe.error)} />}
      <Text variant="meta" color="ink3" align="center">
        الدفع بتحويل InstaPay يدوي، وبنفعّل الاشتراك بعد مراجعة التحويل. التجديد المبكر بيتضاف على المدة الحالية.
      </Text>
    </Screen>
  );
}

function PlanCard({
  plan,
  period,
  featured,
  current,
  loading,
  disabled,
  onChoose,
}: {
  plan: Plan;
  period: BillingPeriod;
  featured: boolean;
  current: boolean;
  loading: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  const t = useTheme();
  const price = period === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly;
  const perMonth = period === 'YEARLY' ? plan.priceYearly / 12 : null;
  return (
    <View style={[styles.plan, { backgroundColor: t.c.surface, borderColor: featured ? t.c.brand : t.c.line, borderWidth: featured ? 2 : 1, borderRadius: t.radius.lg }]}>
      {featured && (
        <View style={[styles.ribbon, { backgroundColor: t.c.brand }]}>
          <Text variant="meta" weight="bold" style={{ color: '#fff' }}>
            الأكثر اختياراً
          </Text>
        </View>
      )}
      <Text variant="section">{plan.nameAr}</Text>
      {!!plan.descriptionAr && (
        <Text variant="ui" color="ink2">
          {plan.descriptionAr}
        </Text>
      )}
      <View style={styles.priceRow}>
        <Text variant="page">{formatMoney(price)}</Text>
        <Text variant="ui" color="ink3">
          / {period === 'MONTHLY' ? 'شهر' : 'سنة'}
        </Text>
      </View>
      {perMonth && (
        <Text variant="meta" color="success">
          يعني {formatMoney(Math.round(perMonth))} في الشهر
        </Text>
      )}
      <View style={styles.features}>
        <Feature text={`لحد ${plan.limits.maxActiveProducts} منتج منشور`} />
        {plan.features.map((f) => (
          <Feature key={f} text={f} />
        ))}
      </View>
      <Button
        label={current ? 'جدّد الباقة' : 'اختار الباقة'}
        variant={featured ? 'primary' : 'secondary'}
        loading={loading}
        disabled={disabled}
        onPress={onChoose}
      />
    </View>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.feature}>
      <Icon as={Check} size={18} color="success" />
      <Text variant="ui" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  current: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggle: { flexDirection: 'row', padding: 4 },
  toggleItem: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  plan: { padding: 18, gap: 8, overflow: 'hidden' },
  ribbon: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, marginBottom: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  features: { gap: 8, marginVertical: 8 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
