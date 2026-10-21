import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Megaphone, Plus, Receipt } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { flatPages, qk, useAdPrices, useSellerAds, useSellerProducts } from '@/api/queries';
import type { Ad, AdPlacement } from '@/api/types';
import { ImageSlot, type UploadedImage } from '@/features/seller/image-slot';
import { InstapayCard } from '@/features/seller/instapay-card';
import { formatDate, formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { AppBar, Badge, Banner, Button, Card, Chip, EmptyState, ErrorState, IconButton, Screen, Select, Sheet, Skeleton, Text, TextField, toast } from '@/ui';

const STATUS: Record<Ad['status'], { label: string; tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  PENDING_REVIEW: { label: 'بيتراجع', tone: 'warning' },
  ACTIVE: { label: 'شغال', tone: 'success' },
  REJECTED: { label: 'اترفض', tone: 'danger' },
  EXPIRED: { label: 'خلص', tone: 'neutral' },
};
const HINT: Record<AdPlacement, string> = {
  SEARCH_TOP: 'منتجك أول حاجة لما حد يدوّر على كلمة في اسمه',
  CATEGORY_TOP: 'منتجك أول القسم بتاعه',
  HOME_BANNER: 'منتجك في «مميز» على الرئيسية لكل الناس',
};

/** Paid placements: pick a product and a spot, transfer by InstaPay, runs after review. */
export default function SellerAds() {
  const t = useTheme();
  const qc = useQueryClient();
  const ads = useSellerAds();
  const prices = useAdPrices();
  const products = useSellerProducts({ status: 'ACTIVE' });
  const items = flatPages(ads.data);
  const productOptions = flatPages(products.data).map((p) => ({ value: p._id, label: p.title }));

  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [placement, setPlacement] = useState<AdPlacement>('SEARCH_TOP');
  const [weeks, setWeeks] = useState(1);
  const [proof, setProof] = useState<UploadedImage | null>(null);
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const price = (prices.data?.find((p) => p.placement === placement)?.weekPrice ?? 0) * weeks;

  const buy = useMutation({
    mutationFn: () => api.post<Ad>('/brand/ads', { productId, placement, weeks, proofFileId: proof!.fileId, transactionReference: latinDigits(reference).trim() }),
    onSuccess: () => {
      haptic.success();
      setOpen(false);
      setProof(null);
      setReference('');
      qc.invalidateQueries({ queryKey: qk.sellerAds });
      toast.success('الطلب اتبعت، هيشتغل بعد مراجعة الإيصال');
    },
    onError: () => haptic.error(),
  });

  const submit = () => {
    const e: Record<string, string> = {};
    if (!productId) e.product = 'اختار المنتج';
    if (!proof) e.proof = 'ارفع صورة إيصال التحويل';
    const r = latinDigits(reference).trim();
    if (r.length < 4 || r.length > 64) e.ref = 'رقم العملية من 4 لـ 64 حرف';
    setErrors(e);
    if (!Object.keys(e).length) buy.mutate();
  };

  return (
    <Screen
      header={<AppBar title="إعلانات مميزة" end={<IconButton icon={Plus} label="إعلان جديد" background="accent" color="onAccent" onPress={() => setOpen(true)} />} />}
      refreshControl={<RefreshControl refreshing={ads.isRefetching} onRefresh={() => void ads.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
    >
      <Banner icon={Megaphone} title="خلّي منتجك يتشاف الأول" body="بتظهر بعلامة «مُموَّل» في المكان اللي تختاره، ومعاك عدد المشاهدات والضغطات." />
      {ads.isLoading ? (
        <Skeleton height={120} />
      ) : ads.error ? (
        <ErrorState error={ads.error} onRetry={() => ads.refetch()} />
      ) : !items.length ? (
        <EmptyState art="box" title="مفيش إعلانات لسه" body="جرّب أسبوع في أول نتايج البحث وشوف الفرق." action="إعلان جديد" onAction={() => setOpen(true)} />
      ) : (
        items.map((a) => (
          <Card key={a.id} style={styles.gap}>
            <View style={styles.between}>
              <Text variant="ui" weight="semibold" numberOfLines={1} style={styles.flex}>
                {a.productTitle}
              </Text>
              <Badge label={STATUS[a.status].label} tone={STATUS[a.status].tone} />
            </View>
            <Text variant="meta" color="ink2">
              {a.placementName} · {a.weeks * 7} يوم · {formatMoney(a.price)}
            </Text>
            {a.endsAt && a.status !== 'REJECTED' && (
              <Text variant="meta" color="ink3">
                {a.status === 'EXPIRED' ? 'خلص' : 'لحد'} {formatDate(a.endsAt)} · {a.impressions} مشاهدة · {a.clicks} ضغطة
              </Text>
            )}
            {a.rejectReason && (
              <Text variant="meta" color="danger">
                السبب: {a.rejectReason}
              </Text>
            )}
          </Card>
        ))
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="إعلان جديد" footer={<Button label={`إرسال الطلب · ${formatMoney(price)}`} loading={buy.isPending} onPress={submit} />}>
        <Select label="المنتج" placeholder="اختار منتج منشور" value={productId} options={productOptions} onChange={setProductId} error={errors.product} />
        <Text variant="ui" color="ink2">
          المكان
        </Text>
        {(prices.data ?? []).map((p) => (
          <Chip key={p.placement} label={`${p.name} · ${formatMoney(p.weekPrice)}/أسبوع`} selected={placement === p.placement} onPress={() => setPlacement(p.placement)} />
        ))}
        <Text variant="meta" color="ink3">
          {HINT[placement]}
        </Text>
        <Text variant="ui" color="ink2">
          المدة
        </Text>
        <View style={styles.wrap}>
          {[1, 2, 4].map((w) => (
            <Chip key={w} label={w === 1 ? 'أسبوع' : w === 2 ? 'أسبوعين' : 'شهر'} selected={weeks === w} onPress={() => setWeeks(w)} />
          ))}
        </View>
        <InstapayCard />
        <Text variant="ui" weight="semibold">
          حوّل {formatMoney(price)} وارفع الإيصال
        </Text>
        <ImageSlot label="صورة إيصال التحويل" purpose="PAYMENT_PROOF" value={proof} onChange={setProof} width="100%" height={160} />
        {errors.proof && (
          <Text variant="meta" color="danger">
            {errors.proof}
          </Text>
        )}
        <TextField label="رقم العملية (Reference)" placeholder="مثال: 123456789012" icon={Receipt} value={reference} onChangeText={setReference} autoCapitalize="characters" ltr error={errors.ref} />
        {buy.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(buy.error)} />}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 6 },
  between: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
