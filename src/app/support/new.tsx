import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { flatPages, qk, useOrders } from '@/api/queries';
import type { Ticket, TicketType } from '@/api/types';
import { PhotoRow } from '@/features/media/photo-row';
import type { UploadedImage } from '@/features/seller/image-slot';
import { TICKET_TYPE_AR } from '@/features/support/ticket-view';
import { haptic } from '@/lib/haptics';
import { AppBar, Banner, Button, Chip, Screen, Text, TextField, toast } from '@/ui';

const ORDER_TYPES: TicketType[] = ['NOT_RECEIVED', 'NOT_AS_DESCRIBED', 'ORDER_PROBLEM'];
const TYPES = Object.keys(TICKET_TYPE_AR) as TicketType[];

/** New ticket; opened from an order it starts on that order. */
export default function NewTicket() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const [type, setType] = useState<TicketType | null>(params.orderId ? null : null);
  const [orderId, setOrderId] = useState<string | null>(params.orderId ?? null);
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<UploadedImage[]>([]);
  const orders = useOrders();
  const recent = flatPages(orders.data).slice(0, 8);

  const aboutOrder = !!type && ORDER_TYPES.includes(type);
  const protection = type === 'NOT_RECEIVED' || type === 'NOT_AS_DESCRIBED';

  const submit = useMutation({
    mutationFn: () =>
      api.post<Ticket>('/support/tickets', {
        type,
        orderId: aboutOrder ? orderId : undefined,
        subject: subject.trim() || TICKET_TYPE_AR[type!],
        text: text.trim(),
        imageFileIds: photos.length ? photos.map((p) => p.fileId) : undefined,
      }),
    onSuccess: (ticket) => {
      haptic.success();
      qc.invalidateQueries({ queryKey: qk.tickets });
      toast.success(ticket.protection ? 'الشكوى وصلت للمتجر ولدعم فاترينة' : 'رسالتك وصلت، هنرد عليك قريب');
      router.replace({ pathname: '/support/[id]', params: { id: ticket.id } });
    },
    onError: (e) => {
      haptic.error();
      toast.error(errorMessage(e));
    },
  });

  const valid = !!type && text.trim().length >= 5 && (!aboutOrder || !!orderId);

  return (
    <Screen header={<AppBar title="تذكرة جديدة" />} keyboard footer={<Button label="ابعت" disabled={!valid} loading={submit.isPending} onPress={() => submit.mutate()} />}>
      <Text variant="section">المشكلة في إيه؟</Text>
      <View style={styles.wrap}>
        {TYPES.map((k) => (
          <Chip key={k} label={TICKET_TYPE_AR[k]} selected={type === k} onPress={() => setType(k)} />
        ))}
      </View>

      {protection && (
        <Banner icon={ShieldCheck} title="الشكوى دي عليها حماية فاترينة" body="المتجر هيشوفها وقدامه 48 ساعة يرد. لو مردش أو مارضيتش بالحل، فريقنا هيحكم." />
      )}

      {aboutOrder && (
        <>
          <Text variant="section">أنهي طلب؟</Text>
          {!recent.length ? (
            <Text variant="ui" color="ink3">
              مفيش طلبات على حسابك.
            </Text>
          ) : (
            <View style={styles.wrap}>
              {recent.map((o) => (
                <Chip key={o.id} label={`#${o.orderNumber} · ${o.brand.name ?? ''}`} selected={orderId === o.id} onPress={() => setOrderId(o.id)} />
              ))}
            </View>
          )}
        </>
      )}

      <TextField label="العنوان" optional value={subject} onChangeText={setSubject} maxLength={120} placeholder={type ? TICKET_TYPE_AR[type] : 'باختصار'} />
      <TextField label="احكيلنا اللي حصل" multiline value={text} onChangeText={setText} maxLength={2000} placeholder="كل ما التفاصيل أوضح، كل ما نحلها أسرع" />
      <Text variant="ui" color="ink2">
        صور (اختياري)
      </Text>
      <PhotoRow purpose="CLAIM_IMAGE" value={photos} onChange={setPhotos} max={4} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
