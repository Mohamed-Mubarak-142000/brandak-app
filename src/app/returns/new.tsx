import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { qk, useReturnEligibility } from '@/api/queries';
import type { ReturnReason, ReturnRequest } from '@/api/types';
import { PhotoRow } from '@/features/media/photo-row';
import { RETURN_REASON_AR } from '@/features/returns/return-view';
import type { UploadedImage } from '@/features/seller/image-slot';
import { formatDate, formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Card, Chip, EmptyState, ErrorState, QuantityStepper, Screen, Skeleton, Text, TextField, toast } from '@/ui';

const REASONS = Object.keys(RETURN_REASON_AR) as ReturnReason[];

/** Return request: pick items and quantities, a reason, and photos. */
export default function NewReturn() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const elig = useReturnEligibility(orderId);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason | null>(null);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<UploadedImage[]>([]);

  const picked = Object.entries(qty).filter(([, n]) => n > 0);
  const total = (elig.data?.items ?? []).reduce((s, i) => s + i.unitPrice * (qty[i.variantId] ?? 0), 0);
  // Photos matter when the problem is the product itself.
  const needsPhotos = reason === 'DAMAGED' || reason === 'NOT_AS_DESCRIBED' || reason === 'WRONG_ITEM';

  const submit = useMutation({
    mutationFn: () =>
      api.post<ReturnRequest>(`/orders/me/${orderId}/returns`, {
        items: picked.map(([variantId, quantity]) => ({ variantId, quantity })),
        reason,
        note: note.trim() || undefined,
        imageFileIds: photos.length ? photos.map((p) => p.fileId) : undefined,
      }),
    onSuccess: (r) => {
      haptic.success();
      qc.invalidateQueries({ queryKey: qk.returns });
      toast.success('طلب الإرجاع وصل للمتجر');
      router.replace({ pathname: '/returns/[id]', params: { id: r.id } });
    },
    onError: (e) => {
      haptic.error();
      toast.error(errorMessage(e));
    },
  });

  const valid = picked.length > 0 && !!reason && (!needsPhotos || photos.length > 0);

  return (
    <Screen
      header={<AppBar title="طلب إرجاع" />}
      keyboard
      footer={
        elig.data?.open ? (
          <Button label={picked.length ? `ابعت طلب الإرجاع · منتجات بـ ${formatMoney(total)}` : 'اختار المنتجات'} disabled={!valid} loading={submit.isPending} onPress={() => submit.mutate()} />
        ) : undefined
      }
    >
      {elig.isLoading ? (
        <Skeleton height={220} />
      ) : elig.error || !elig.data ? (
        <ErrorState error={elig.error} onRetry={() => elig.refetch()} />
      ) : !elig.data.open ? (
        <EmptyState
          art="box"
          title={elig.data.returnDays === 0 ? 'المتجر ده مش بيقبل مرتجعات' : 'الإرجاع مش متاح'}
          body={
            elig.data.returnDays === 0
              ? 'لو المنتج فيه مشكلة أو مختلف عن الصور، افتح شكوى ودعم فاترينة هيساعدك.'
              : 'يا إما مدة الإرجاع خلصت، يا إما كل المنتجات ليها طلب إرجاع بالفعل.'
          }
          action="عندي مشكلة"
          onAction={() => router.replace({ pathname: '/support/new', params: { orderId } })}
        />
      ) : (
        <>
          {elig.data.until && <Banner icon={Undo2} title={`تقدر ترجع لحد ${formatDate(elig.data.until)}`} body="المتجر بيراجع الطلب، وبعد ما يستلم المنتجات بيرجعلك فلوسها." />}
          <Text variant="section">إيه اللي عايز ترجعه؟</Text>
          {elig.data.items.map((i) => (
            <Card key={i.variantId} style={[styles.row, i.returnable === 0 && styles.dim]}>
              <Image source={i.imageUrl} style={[styles.thumb, { backgroundColor: t.c.sunken }]} contentFit="cover" />
              <View style={styles.flex}>
                <Text variant="ui" weight="semibold" numberOfLines={2}>
                  {i.title}
                </Text>
                <Text variant="meta" color="ink3">
                  {[i.size, i.color].filter(Boolean).join(' · ')} · {formatMoney(i.unitPrice)}
                </Text>
                {i.returnable === 0 && (
                  <Text variant="meta" color="ink3">
                    عليه طلب إرجاع بالفعل
                  </Text>
                )}
              </View>
              {i.returnable > 0 && (
                <QuantityStepper value={qty[i.variantId] ?? 0} min={0} max={i.returnable} onChange={(n) => setQty((q) => ({ ...q, [i.variantId]: n }))} compact />
              )}
            </Card>
          ))}

          <Text variant="section">السبب</Text>
          <View style={styles.wrap}>
            {REASONS.map((r) => (
              <Chip key={r} label={RETURN_REASON_AR[r]} selected={reason === r} onPress={() => setReason(r)} />
            ))}
          </View>
          <TextField label="تفاصيل" optional multiline value={note} onChangeText={setNote} maxLength={1000} placeholder="مثلاً: المقاس واسع على الكتف" />
          <Text variant="ui" color="ink2">
            صور المنتج {needsPhotos ? '(مطلوبة عشان المتجر يشوف المشكلة)' : '(اختياري)'}
          </Text>
          <PhotoRow purpose="CLAIM_IMAGE" value={photos} onChange={setPhotos} max={4} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dim: { opacity: 0.55 },
  thumb: { width: 52, height: 64, borderRadius: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
