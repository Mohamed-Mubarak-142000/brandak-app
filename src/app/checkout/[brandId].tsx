import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Banknote, CircleAlert, MapPin, Plus, ShieldCheck } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, ApiError, errorMessage } from '@/api/client';
import { qk, useAddresses, useCart } from '@/api/queries';
import type { OrderDetail, Quote } from '@/api/types';
import { AddressCard } from '@/features/checkout/address-card';
import { AddressForm } from '@/features/checkout/address-form';
import { formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Card, Divider, Icon, Screen, Sheet, Skeleton, Tap, Text, TextField } from '@/ui';

export default function Checkout() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { brandId } = useLocalSearchParams<{ brandId: string }>();
  const cart = useCart(brandId);
  const addresses = useAddresses();
  const [pickedId, setAddressId] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [priceChanged, setPriceChanged] = useState<number | null>(null);
  // One key per checkout attempt: a retried tap (or a flaky network) never creates two orders.
  const idemKey = useRef(Crypto.randomUUID());

  const fallbackId = (addresses.data?.find((a) => a.isDefault) ?? addresses.data?.[0])?.id ?? null;
  const addressId = pickedId ?? fallbackId;

  const address = addresses.data?.find((a) => a.id === addressId);
  const quote = useQuery({
    queryKey: ['quote', brandId, addressId],
    queryFn: () => api.post<Quote>(`/checkout/${brandId}/quote`, { addressId }),
    enabled: !!addressId,
    retry: false,
    staleTime: 0,
  });

  const place = useMutation({
    mutationFn: () =>
      api.post<OrderDetail>(
        `/checkout/${brandId}/orders`,
        { addressId, paymentMethod: 'COD', notes: notes.trim() || undefined, expectedTotal: quote.data?.grandTotal },
        { 'Idempotency-Key': idemKey.current },
      ),
    onSuccess: (order) => {
      haptic.success();
      qc.removeQueries({ queryKey: qk.cart(brandId) });
      qc.invalidateQueries({ queryKey: qk.carts });
      qc.invalidateQueries({ queryKey: ['orders'] });
      router.replace({ pathname: '/order/success', params: { id: order.id, number: order.orderNumber, brand: order.brand.name, total: String(order.grandTotal) } });
    },
    onError: async (e) => {
      haptic.error();
      if (e instanceof ApiError && e.code === 'PRICE_CHANGED') {
        idemKey.current = Crypto.randomUUID();
        const fresh = await quote.refetch();
        setPriceChanged(fresh.data?.grandTotal ?? null);
      }
    },
  });

  const q = quote.data;
  const noAddress = addresses.isSuccess && !addresses.data.length;

  return (
    <Screen
      header={<AppBar title={cart.data ? `إتمام طلب ${cart.data.brand.name}` : 'إتمام الطلب'} />}
      footer={
        <View style={styles.footerRow}>
          <View>
            <Text variant="meta" color="ink3">
              الإجمالي
            </Text>
            {q ? <Text variant="section">{formatMoney(q.grandTotal)}</Text> : <Skeleton width={90} height={24} />}
          </View>
          <Button
            label="تأكيد الطلب"
            style={styles.flex}
            disabled={!q || !addressId}
            loading={place.isPending}
            onPress={() => place.mutate()}
            accessibilityHint="الدفع كاش عند الاستلام"
          />
        </View>
      }
    >
      {/* 1. Address */}
      <Step n={1} title="التوصيل لـ">
        {addresses.isLoading ? (
          <Skeleton height={110} radius={12} />
        ) : noAddress ? (
          <Card>
            <Text variant="ui" color="ink2" style={styles.mb}>
              ضيف عنوان التوصيل عشان نحسب الشحن.
            </Text>
            <Button label="إضافة عنوان" icon={Plus} variant="soft" onPress={() => setAddOpen(true)} />
          </Card>
        ) : address ? (
          <Tap onPress={() => setPickOpen(true)} pressScale={0.99} accessibilityLabel="تغيير العنوان">
            <AddressCard
              address={address}
              selected
              end={
                <Text variant="ui" color="accent" weight="bold">
                  تغيير
                </Text>
              }
            />
          </Tap>
        ) : null}
      </Step>

      {/* 2. Summary */}
      <Step n={2} title="ملخص الطلب">
        {quote.error ? (
          <Banner
            icon={CircleAlert}
            tone="danger"
            title={errorMessage(quote.error)}
            body={quote.error instanceof ApiError && quote.error.code === 'NOT_DELIVERABLE' ? 'اختار عنوان في محافظة تانية.' : undefined}
            action="ارجع للسلة"
            onAction={() => router.back()}
          />
        ) : (
          <Card style={styles.gap}>
            {(q?.items ?? cart.data?.items ?? []).map((line) => (
              <View key={line.itemId} style={styles.line}>
                <Image source={line.imageUrl} style={[styles.thumb, { backgroundColor: t.c.sunken }]} contentFit="cover" />
                <View style={styles.flex}>
                  <Text variant="ui" numberOfLines={1}>
                    {line.title}
                  </Text>
                  <Text variant="meta" color="ink3">
                    {[line.size, line.color, `× ${line.quantity}`].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text variant="ui" weight="semibold">
                  {formatMoney(line.lineTotal)}
                </Text>
              </View>
            ))}
            <Divider />
            {q ? (
              <>
                <Row label="المنتجات" value={formatMoney(q.subtotal)} />
                <Row label="الشحن" value={q.shippingFee ? formatMoney(q.shippingFee) : 'مجاني'} highlight={!q.shippingFee} />
                {q.discountTotal > 0 && <Row label="الخصم" value={`- ${formatMoney(q.discountTotal)}`} highlight />}
                <Divider />
                <Row label="الإجمالي" value={formatMoney(q.grandTotal)} strong />
              </>
            ) : addressId ? (
              <Skeleton height={70} />
            ) : (
              <Text variant="meta" color="ink3">
                الشحن هيتحسب بعد اختيار العنوان
              </Text>
            )}
          </Card>
        )}
      </Step>

      {/* 3. Payment */}
      <Step n={3} title="طريقة الدفع">
        <View style={[styles.pay, { borderColor: t.c.brand, backgroundColor: t.c.accentSoft, borderRadius: t.radius.md }]} accessibilityRole="radio" accessibilityState={{ checked: true }}>
          <Icon as={Banknote} color="accent" size={26} />
          <View style={styles.flex}>
            <Text variant="ui" weight="bold">
              كاش عند الاستلام
            </Text>
            <Text variant="meta" color="ink2">
              ادفع للمندوب لما الطلب يوصلك
            </Text>
          </View>
          <View style={[styles.radio, { borderColor: t.c.accent }]}>
            <View style={[styles.radioDot, { backgroundColor: t.c.accent }]} />
          </View>
        </View>
      </Step>

      {/* 4. Notes */}
      <Step n={4} title="ملاحظات للمتجر">
        <TextField label="ملاحظات" optional multiline value={notes} onChangeText={setNotes} maxLength={300} placeholder="مثلاً: اتصل قبل ما توصل" />
      </Step>

      {place.error && !(place.error instanceof ApiError && place.error.code === 'PRICE_CHANGED') && <Banner icon={CircleAlert} tone="danger" title={errorMessage(place.error)} />}
      <View style={styles.trust}>
        <Icon as={ShieldCheck} size={16} color="success" />
        <Text variant="meta" color="ink2">
          طلبك محمي — تقدر تلغيه مجاناً لحد ما المتجر يأكده
        </Text>
      </View>

      <Sheet open={pickOpen} onClose={() => setPickOpen(false)} title="اختار عنوان التوصيل">
        {addresses.data?.map((a) => (
          <Tap
            key={a.id}
            pressScale={0.99}
            onPress={() => {
              setAddressId(a.id);
              setPickOpen(false);
            }}
          >
            <AddressCard address={a} selected={a.id === addressId} />
          </Tap>
        ))}
        <Button
          label="عنوان جديد"
          icon={Plus}
          variant="secondary"
          onPress={() => {
            setPickOpen(false);
            setAddOpen(true);
          }}
        />
      </Sheet>
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="عنوان جديد">
        <AddressForm
          forceDefault={noAddress}
          onSaved={(a) => {
            setAddressId(a.id);
            setAddOpen(false);
          }}
        />
      </Sheet>
      <Sheet open={priceChanged !== null} onClose={() => setPriceChanged(null)} title="الأسعار اتغيرت">
        <Text variant="body" color="ink2">
          المتجر غيّر سعر منتج أو الشحن. الإجمالي الجديد:
        </Text>
        <Text variant="page" color="accent">
          {formatMoney(priceChanged ?? 0)}
        </Text>
        <Button
          label="تأكيد بالسعر الجديد"
          loading={place.isPending}
          onPress={() => {
            setPriceChanged(null);
            place.mutate();
          }}
        />
        <Button label="رجوع للسلة" variant="secondary" onPress={() => router.back()} />
      </Sheet>
    </Screen>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.gap}>
      <View style={styles.stepHead}>
        <View style={[styles.stepNum, { backgroundColor: t.c.ink }]}>
          <Text variant="meta" weight="bold" color="ground">
            {n}
          </Text>
        </View>
        <Text variant="bodyStrong">{title}</Text>
        {n === 1 && <Icon as={MapPin} size={16} color="ink3" />}
      </View>
      {children}
    </View>
  );
}

function Row({ label, value, strong, highlight }: { label: string; value: string; strong?: boolean; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant={strong ? 'bodyStrong' : 'ui'} color={strong ? 'ink' : 'ink2'}>
        {label}
      </Text>
      <Text variant={strong ? 'section' : 'ui'} weight={strong ? undefined : 'semibold'} color={highlight ? 'success' : 'ink'}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  mb: { marginBottom: 10 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 44, height: 54, borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pay: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
});
