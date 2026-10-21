import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { HandCoins, PackageSearch, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { flatPages, useResellerEarnings, useResellerMe, useResellerPayouts, type ResellerEarning } from '@/api/queries';
import { formatDate, formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Badge, Banner, Button, Card, Divider, ErrorState, Screen, Skeleton, Text, TextField, toast } from '@/ui';

const EARNING: Record<ResellerEarning['status'], { label: string; tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  PENDING: { label: 'لسه موصلش', tone: 'warning' },
  AVAILABLE: { label: 'متاح', tone: 'success' },
  REQUESTED: { label: 'في طلب صرف', tone: 'brand' },
  PAID: { label: 'اتصرف', tone: 'neutral' },
  CANCELLED: { label: 'اتلغى', tone: 'danger' },
};

/**
 * Selling with Fatrina: pick products from stores that work with resellers, sell to your own
 * followers at your price, and Fatrina pays you the difference after delivery.
 */
export default function Reseller() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useResellerMe();
  const earnings = useResellerEarnings();
  const payouts = useResellerPayouts();
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');

  const join = useMutation({
    mutationFn: () => api.post('/reseller/join', { payoutAddress: address.trim(), payoutName: name.trim() }),
    onSuccess: () => {
      haptic.success();
      qc.invalidateQueries({ queryKey: ['reseller'] });
      toast.success('أهلاً بيك كمسوّق على فاترينة');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const payout = useMutation({
    mutationFn: () => api.post('/reseller/payouts'),
    onSuccess: () => {
      haptic.success();
      qc.invalidateQueries({ queryKey: ['reseller'] });
      toast.success('طلب الصرف اتبعت، هنحوّلك قريب');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const d = me.data;
  return (
    <Screen
      header={<AppBar title="بيع واكسب" />}
      keyboard
      refreshControl={<RefreshControl refreshing={me.isRefetching} onRefresh={() => void qc.invalidateQueries({ queryKey: ['reseller'] })} tintColor={t.c.brand} colors={[t.c.brand]} />}
    >
      {me.isLoading ? (
        <Skeleton height={200} />
      ) : me.error || !d ? (
        <ErrorState error={me.error} onRetry={() => me.refetch()} />
      ) : !d.joined ? (
        <>
          <Banner
            icon={HandCoins}
            title="بيع منتجات المتاجر بسعرك"
            body="اختار منتجات من متاجر بتشتغل مع المسوّقين، اعرضها على صفحتك بسعرك. لما عميلك يطلب، اطلبله من التطبيق بسعرك وعنوانه. المتجر بيشحن ويحصّل، وفاترينة بتحوّلك الفرق بعد التوصيل."
          />
          <TextField label="عنوان InstaPay أو رقم المحفظة" value={address} onChangeText={setAddress} autoCapitalize="none" ltr placeholder="name@instapay" maxLength={80} />
          <TextField label="الاسم على الحساب" value={name} onChangeText={setName} maxLength={80} />
          <Button label="ابدأ كمسوّق" loading={join.isPending} disabled={address.trim().length < 4 || name.trim().length < 2} onPress={() => join.mutate()} />
        </>
      ) : (
        <>
          {d.status === 'SUSPENDED' && <Banner icon={HandCoins} tone="danger" title="حساب المسوّق موقوف" body="تواصل مع دعم فاترينة." />}
          <Card style={styles.gap}>
            <Text variant="meta" color="ink3">
              متاح للصرف
            </Text>
            <Text variant="page">{formatMoney(d.wallet.available)}</Text>
            <View style={styles.stats}>
              <Stat label="لسه موصلش" value={formatMoney(d.wallet.pending)} />
              <Stat label="في طلب صرف" value={formatMoney(d.wallet.requested)} />
              <Stat label="اتصرف" value={formatMoney(d.wallet.paid)} />
            </View>
            <Button
              label={d.wallet.available >= d.minPayout ? `اطلب صرف ${formatMoney(d.wallet.available)}` : `الصرف من ${formatMoney(d.minPayout)}`}
              icon={Wallet}
              disabled={d.wallet.available < d.minPayout || d.status !== 'ACTIVE'}
              loading={payout.isPending}
              onPress={() => payout.mutate()}
            />
            <Text variant="meta" color="ink3">
              بنحوّل على {d.payoutAddress} ({d.payoutName})
            </Text>
          </Card>
          <Button label="منتجات تقدر تبيعها" icon={PackageSearch} variant="secondary" onPress={() => router.push('/reseller/products')} />
          <Banner
            icon={HandCoins}
            title="إزاي تطلب لعميلك؟"
            body={`ضيف المنتج للسلة، وفي صفحة إتمام الطلب اختار «بيع لعميل»، اكتب بياناته وعنوانه وسعرك (لحد ${Math.round((1 + d.maxMarkup) * 100)}% من سعر المتجر).`}
          />

          <Text variant="section">أرباحك</Text>
          {earnings.isLoading ? (
            <Skeleton height={80} />
          ) : !flatPages(earnings.data).length ? (
            <Text variant="ui" color="ink3">
              لسه مفيش طلبات.
            </Text>
          ) : (
            <Card>
              {flatPages(earnings.data).map((e, i) => (
                <View key={e._id}>
                  {i > 0 && <Divider />}
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <Text variant="ui">طلب #{e.orderNumber}</Text>
                      <Text variant="meta" color="ink3">
                        {formatDate(e.createdAt)}
                      </Text>
                    </View>
                    <Badge label={EARNING[e.status].label} tone={EARNING[e.status].tone} />
                    <Text variant="ui" weight="bold">
                      {formatMoney(e.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}

          {!!flatPages(payouts.data).length && (
            <>
              <Text variant="section">طلبات الصرف</Text>
              <Card>
                {flatPages(payouts.data).map((p, i) => (
                  <View key={p._id}>
                    {i > 0 && <Divider />}
                    <View style={styles.row}>
                      <View style={styles.flex}>
                        <Text variant="ui">{formatMoney(p.amount)}</Text>
                        <Text variant="meta" color="ink3">
                          {formatDate(p.createdAt)}
                          {p.reference ? ` · رقم العملية ${p.reference}` : ''}
                          {p.rejectReason ? ` · ${p.rejectReason}` : ''}
                        </Text>
                      </View>
                      <Badge
                        label={p.status === 'PAID' ? 'اتحوّل' : p.status === 'REJECTED' ? 'محتاج مراجعة' : 'بيتراجع'}
                        tone={p.status === 'PAID' ? 'success' : p.status === 'REJECTED' ? 'danger' : 'warning'}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="meta" color="ink3">
        {label}
      </Text>
      <Text variant="ui" weight="semibold">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 8 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
});
