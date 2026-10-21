import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Banknote, CircleAlert, Coins, Gift, HandCoins, MapPin, Plus, ShieldCheck, Store, TicketPercent, Truck, User } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { api, ApiError, errorMessage } from '@/api/client';
import { qk, useAddresses, useBrand, useCart, useResellerMe } from '@/api/queries';
import type { OrderDetail, Quote } from '@/api/types';
import { AddressCard } from '@/features/checkout/address-card';
import { AddressForm } from '@/features/checkout/address-form';
import { formatMoney } from '@/lib/format';
import { latinDigits } from '@/lib/validation';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Card, Chip, Divider, Icon, Screen, Sheet, Skeleton, Tap, Text, TextField, toast } from '@/ui';

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
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [priceChanged, setPriceChanged] = useState<number | null>(null);
  // One key per checkout attempt: a retried tap (or a flaky network) never creates two orders.
  const [firstKey] = useState(() => Crypto.randomUUID());
  const idemKey = useRef(firstKey);

  const fallbackId = (addresses.data?.find((a) => a.isDefault) ?? addresses.data?.[0])?.id ?? null;
  const addressId = pickedId ?? fallbackId;

  const address = addresses.data?.find((a) => a.id === addressId);
  // Stores with a showroom can let customers collect the order themselves (no shipping).
  const brand = useBrand(cart.data?.brand.slug ?? '');
  const pickup = brand.data?.shipping.pickup;
  const [fulfillment, setFulfillment] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const isPickup = fulfillment === 'PICKUP' && !!pickup?.enabled;
  // Points (Fatrina pays the discount), gifts, and resellers selling to their own customers.
  const [usePoints, setUsePoints] = useState(false);
  const [gift, setGift] = useState(false);
  const [giftMsg, setGiftMsg] = useState('');
  const reseller = useResellerMe();
  const canResell = !!reseller.data?.joined && reseller.data.status === 'ACTIVE' && !!brand.data?.shipping.allowResellers;
  const [resaleMode, setResaleMode] = useState(false);
  const resaleOn = canResell && resaleMode;
  const [resaleName, setResaleName] = useState('');
  const [resalePhone, setResalePhone] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [pricesOpen, setPricesOpen] = useState(false);
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const resale = resaleOn
    ? { customerName: resaleName.trim() || 'العميل', customerPhone: latinDigits(resalePhone).replace(/\s/g, '') || '01000000000', prices: Object.entries(prices).map(([variantId, price]) => ({ variantId, price })) }
    : undefined;
  const openPrices = () => {
    setDraftPrices(Object.fromEntries((cart.data?.items ?? []).map((l) => [l.variantId, String(prices[l.variantId] ?? l.unitPrice)])));
    setPricesOpen(true);
  };
  const where = isPickup && !resaleOn ? { fulfillment: 'PICKUP' as const } : { addressId };
  const extra = resaleOn ? { resale } : { usePoints: usePoints || undefined, couponCode: coupon ?? undefined };
  const ready = (isPickup && !resaleOn) || !!addressId;
  const quote = useQuery({
    queryKey: ['quote', brandId, isPickup && !resaleOn ? 'pickup' : addressId, coupon, usePoints, resaleOn, prices],
    queryFn: () => api.post<Quote>(`/checkout/${brandId}/quote`, { ...where, ...extra }),
    enabled: ready,
    retry: false,
    staleTime: 0,
  });

  const place = useMutation({
    mutationFn: () =>
      api.post<OrderDetail>(
        `/checkout/${brandId}/orders`,
        {
          ...where,
          ...extra,
          paymentMethod: 'COD',
          notes: notes.trim() || undefined,
          expectedTotal: quote.data?.grandTotal,
          gift: gift && !resaleOn && !isPickup ? { message: giftMsg.trim() || undefined, hidePrices: true } : undefined,
        },
        { 'Idempotency-Key': idemKey.current },
      ),
    onSuccess: (order) => {
      haptic.success();
      qc.removeQueries({ queryKey: qk.cart(brandId) });
      qc.invalidateQueries({ queryKey: qk.carts });
      qc.invalidateQueries({ queryKey: ['orders'] });
      // New customers confirm the order with an emailed code before the store sees it.
      if (order.status === 'AWAITING_CONFIRMATION') router.replace({ pathname: '/order/confirm', params: { id: order.id } });
      else router.replace({ pathname: '/order/success', params: { id: order.id, number: order.orderNumber, brand: order.brand.name, total: String(order.grandTotal) } });
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

  // Checked against the server before it's applied, so the error shows next to the field.
  const checkCoupon = useMutation({
    mutationFn: (code: string) => api.post<Quote>(`/checkout/${brandId}/quote`, { ...where, usePoints: usePoints || undefined, couponCode: code }),
    onSuccess: (res, code) => {
      haptic.success();
      qc.setQueryData(['quote', brandId, isPickup && !resaleOn ? 'pickup' : addressId, code, usePoints, resaleOn, prices], res);
      setCoupon(code);
      setCouponInput('');
    },
    onError: (e) => {
      haptic.error();
      setCouponError(errorMessage(e));
    },
  });

  const q = quote.data;
  const noAddress = addresses.isSuccess && !addresses.data.length;

  return (
    <Screen
      keyboard
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
            disabled={!q || !ready || (resaleOn && (resaleName.trim().length < 2 || latinDigits(resalePhone).replace(/\D/g, '').length < 10))}
            loading={place.isPending}
            onPress={() => place.mutate()}
            accessibilityHint="الدفع كاش عند الاستلام"
          />
        </View>
      }
    >
      {/* 1. Address (or pickup from the store) */}
      <Step n={1} title={isPickup && !resaleOn ? 'الاستلام من' : resaleOn ? 'التوصيل لعميلك' : 'التوصيل لـ'}>
        {canResell && (
          <View style={styles.choice}>
            <Chip label="طلب ليا" icon={User} selected={!resaleOn} onPress={() => setResaleMode(false)} />
            <Chip label="بيع لعميل (مسوّق)" icon={HandCoins} selected={resaleOn} onPress={() => setResaleMode(true)} />
          </View>
        )}
        {resaleOn && (
          <Card style={styles.gap}>
            <Text variant="ui" color="ink2">
              بيانات عميلك: المتجر هيشحنله ويحصّل منه بسعرك، وربحك بيوصلك من فاترينة بعد التوصيل.
            </Text>
            <TextField label="اسم العميل" value={resaleName} onChangeText={setResaleName} maxLength={80} />
            <TextField label="موبايل العميل" value={resalePhone} onChangeText={setResalePhone} keyboardType="phone-pad" ltr placeholder="01xxxxxxxxx" />
            <Text variant="meta" color="ink3">
              اختار تحت عنوان العميل (أو ضيف عنوان جديد باسمه).
            </Text>
          </Card>
        )}
        {pickup?.enabled && !resaleOn && (
          <View style={styles.choice}>
            <Chip label="توصيل لعنواني" icon={Truck} selected={!isPickup} onPress={() => setFulfillment('DELIVERY')} />
            <Chip label="هستلم من المتجر" icon={Store} selected={isPickup} onPress={() => setFulfillment('PICKUP')} />
          </View>
        )}
        {isPickup && !resaleOn ? (
          <Card style={styles.gap}>
            <View style={styles.line}>
              <Icon as={Store} color="accent" />
              <View style={styles.flex}>
                <Text variant="ui" weight="semibold">
                  {pickup.address}
                </Text>
                {!!pickup.hours && (
                  <Text variant="meta" color="ink3">
                    المواعيد: {pickup.hours}
                  </Text>
                )}
              </View>
            </View>
            {!!pickup.mapUrl && <Button label="افتح على الخريطة" icon={MapPin} variant="soft" size="md" onPress={() => WebBrowser.openBrowserAsync(pickup.mapUrl!).catch(() => undefined)} />}
            <Text variant="meta" color="ink3">
              من غير مصاريف شحن. المتجر هيبلغك لما الطلب يبقى جاهز، وتدفع وانت بتستلم.
            </Text>
          </Card>
        ) : addresses.isLoading ? (
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
            action={quote.error instanceof ApiError && quote.error.code.startsWith('RESALE') ? 'عدّل الأسعار' : 'ارجع للسلة'}
            onAction={() => (quote.error instanceof ApiError && quote.error.code.startsWith('RESALE') ? openPrices() : router.back())}
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
                {!!q.coupon?.discount && <Row label={`خصم الكود ${q.coupon.code}`} value={`- ${formatMoney(q.coupon.discount)}`} highlight />}
                {!!q.points?.discount && <Row label={`خصم ${q.points.used} نقطة`} value={`- ${formatMoney(q.points.discount)}`} highlight />}
                {!q.coupon && !q.points?.discount && q.discountTotal > 0 && <Row label="الخصم" value={`- ${formatMoney(q.discountTotal)}`} highlight />}
                {q.resale && <Row label="ربحك من الطلب" value={formatMoney(q.resale.margin)} highlight />}
                <Divider />
                <Row label="الإجمالي" value={formatMoney(q.grandTotal)} strong />
              </>
            ) : ready ? (
              <Skeleton height={70} />
            ) : (
              <Text variant="meta" color="ink3">
                الشحن هيتحسب بعد اختيار العنوان
              </Text>
            )}
          </Card>
        )}
        {resaleOn && (
          <Button
            label="أسعار البيع لعميلك"
            icon={HandCoins}
            variant="soft"
            onPress={openPrices}
          />
        )}
        {ready && !resaleOn && !!q?.points?.balance && (
          <View style={[styles.pointsRow, { borderColor: t.c.line, borderRadius: t.radius.md, backgroundColor: t.c.surface }]}>
            <Icon as={Coins} color="accent" />
            <View style={styles.flex}>
              <Text variant="ui" weight="semibold">
                معاك {q.points.balance} نقطة
              </Text>
              <Text variant="meta" color="ink3">
                {q.points.usable
                  ? `استخدم ${q.points.usable} نقطة واخصم ${formatMoney(q.points.usableDiscount)}`
                  : q.points.balance >= 100
                    ? 'الطلب صغير على استخدام النقاط (لحد 20% من قيمته)'
                    : 'تقدر تستخدم النقاط من 100 نقطة'}
              </Text>
            </View>
            <Switch
              value={usePoints && !!q.points.usable}
              disabled={!q.points.usable}
              onValueChange={setUsePoints}
              trackColor={{ true: t.c.accent, false: t.c.lineStrong }}
              thumbColor="#fff"
              accessibilityLabel="استخدام النقاط"
            />
          </View>
        )}
        {ready && !resaleOn && (
          <View style={styles.couponRow}>
            {coupon ? (
              <View style={[styles.couponApplied, { backgroundColor: t.c.successSoft, borderRadius: t.radius.md }]}>
                <Icon as={TicketPercent} color="success" size={20} />
                <Text variant="ui" weight="semibold" color="success" style={styles.flex}>
                  الكود {coupon} اتطبق
                </Text>
                <Tap onPress={() => setCoupon(null)} hitSlop={8} pressScale={1} accessibilityLabel="شيل الكود">
                  <Text variant="ui" color="ink2">
                    شيل
                  </Text>
                </Tap>
              </View>
            ) : (
              <>
                <View style={styles.flex}>
                  <TextField label="كود خصم" optional value={couponInput} onChangeText={(v) => { setCouponInput(v); setCouponError(null); }} autoCapitalize="characters" ltr placeholder="SAVE10" error={couponError ?? undefined} />
                </View>
                <Button
                  label="تطبيق"
                  size="md"
                  variant="secondary"
                  block={false}
                  loading={checkCoupon.isPending}
                  disabled={couponInput.trim().length < 3}
                  onPress={() => checkCoupon.mutate(couponInput.trim())}
                  style={styles.couponBtn}
                />
              </>
            )}
          </View>
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
        {!resaleOn && !isPickup && (
          <View style={[styles.pointsRow, { borderColor: gift ? t.c.brand : t.c.line, borderRadius: t.radius.md, backgroundColor: t.c.surface }]}>
            <Icon as={Gift} color="accent" />
            <View style={styles.flex}>
              <Text variant="ui" weight="semibold">
                ده هدية
              </Text>
              <Text variant="meta" color="ink3">
                كارت بكلامك، ومن غير فاتورة بالسعر جوه الطرد. اختار عنوان اللي هتهاديه.
              </Text>
            </View>
            <Switch value={gift} onValueChange={setGift} trackColor={{ true: t.c.accent, false: t.c.lineStrong }} thumbColor="#fff" accessibilityLabel="ده هدية" />
          </View>
        )}
        {gift && !resaleOn && !isPickup && <TextField label="كلام الكارت" optional multiline value={giftMsg} onChangeText={setGiftMsg} maxLength={300} placeholder="كل سنة وانت طيب ❤️" />}
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
      <Sheet
        open={pricesOpen}
        onClose={() => setPricesOpen(false)}
        title="أسعار البيع"
        footer={
          <Button
            label="تطبيق الأسعار"
            onPress={() => {
              const next: Record<string, number> = {};
              const markup = reseller.data?.joined ? reseller.data.maxMarkup : 1;
              for (const l of cart.data?.items ?? []) {
                const n = Number(latinDigits(draftPrices[l.variantId] ?? ''));
                const max = Math.round(l.unitPrice * (1 + markup) * 100) / 100;
                if (!Number.isFinite(n) || n < l.unitPrice || n > max) {
                  toast.error(`سعر «${l.title}» لازم يكون بين ${formatMoney(l.unitPrice)} و${formatMoney(max)}`);
                  return;
                }
                next[l.variantId] = n;
              }
              setPrices(next);
              setPricesOpen(false);
            }}
          />
        }
      >
        <Text variant="meta" color="ink3">
          سعر القطعة لعميلك: من سعر المتجر لحد الضعف. الفرق ربحك.
        </Text>
        {(cart.data?.items ?? []).map((l) => (
          <View key={l.variantId} style={styles.line}>
            <View style={styles.flex}>
              <Text variant="ui" numberOfLines={1}>
                {l.title}
              </Text>
              <Text variant="meta" color="ink3">
                سعر المتجر {formatMoney(l.unitPrice)} · × {l.quantity}
              </Text>
            </View>
            <View style={styles.priceField}>
              <TextField label="سعرك" value={draftPrices[l.variantId] ?? ''} onChangeText={(s) => setDraftPrices((d) => ({ ...d, [l.variantId]: s }))} keyboardType="decimal-pad" ltr />
            </View>
          </View>
        ))}
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
  choice: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, marginTop: 10 },
  priceField: { width: 110 },
  couponRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 12 },
  couponBtn: { marginBottom: 2 },
  couponApplied: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
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
