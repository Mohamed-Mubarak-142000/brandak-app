import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, Clock, Send, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import type { Ticket, TicketStatus, TicketType } from '@/api/types';
import { PhotoRow, PhotoStrip } from '@/features/media/photo-row';
import type { UploadedImage } from '@/features/seller/image-slot';
import { formatDate, formatRelative } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Badge, Banner, Button, Card, Icon, Tap, Text, TextField, toast } from '@/ui';

export const TICKET_TYPE_AR: Record<TicketType, string> = {
  NOT_RECEIVED: 'الطلب موصلش',
  NOT_AS_DESCRIBED: 'المنتج مختلف عن الصور',
  ORDER_PROBLEM: 'مشكلة تانية في الطلب',
  PAYMENT: 'الدفع والفلوس',
  ACCOUNT: 'حسابي',
  OTHER: 'حاجة تانية',
};

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  WAITING_STORE: { label: 'مستنية رد المتجر', tone: 'warning' },
  OPEN: { label: 'مع دعم فاترينة', tone: 'brand' },
  ESCALATED: { label: 'فاترينة بتحكم فيها', tone: 'danger' },
  RESOLVED: { label: 'اتحلت', tone: 'success' },
  CLOSED: { label: 'مقفولة', tone: 'neutral' },
};

const ACTIVE: TicketStatus[] = ['WAITING_STORE', 'OPEN', 'ESCALATED'];
export const isActiveTicket = (t: Ticket) => ACTIVE.includes(t.status);

/** Hours left for the store to answer a protection case (null when not waiting). */
export function hoursLeft(t: Ticket, now: number) {
  if (t.status !== 'WAITING_STORE' || !t.storeDeadline) return null;
  return Math.max(0, Math.ceil((new Date(t.storeDeadline).getTime() - now) / 3_600_000));
}

export function TicketCard({ ticket, onPress, now }: { ticket: Ticket; onPress: () => void; now: number }) {
  const s = TICKET_STATUS[ticket.status];
  const left = hoursLeft(ticket, now);
  return (
    <Tap onPress={onPress} pressScale={0.99} accessibilityLabel={ticket.subject}>
      <Card style={styles.cardRow}>
        <View style={styles.flex}>
          <View style={styles.inline}>
            {ticket.protection && <Icon as={ShieldCheck} size={16} color="accent" />}
            <Text variant="ui" weight="semibold" numberOfLines={1} style={styles.flex}>
              {ticket.subject}
            </Text>
          </View>
          <Text variant="meta" color="ink3" numberOfLines={1}>
            {TICKET_TYPE_AR[ticket.type]}
            {ticket.orderNumber ? ` · طلب #${ticket.orderNumber}` : ''} · {formatRelative(ticket.updatedAt)}
          </Text>
          <View style={styles.inline}>
            <Badge label={s.label} tone={s.tone} />
            {left != null && (
              <Text variant="meta" color={left <= 12 ? 'danger' : 'ink2'}>
                باقي {left} ساعة
              </Text>
            )}
          </View>
        </View>
        <Icon as={ChevronLeft} color="ink3" />
      </Card>
    </Tap>
  );
}

const AUTHOR_AR = { CUSTOMER: 'العميل', BRAND: 'المتجر', ADMIN: 'دعم فاترينة' } as const;

/**
 * The conversation on a ticket plus a reply box. `me` decides which bubbles are "mine";
 * `replyPath` is the endpoint for this viewer (customer, store).
 */
export function TicketThread({ ticket, me, replyPath, onUpdated }: { ticket: Ticket; me: 'CUSTOMER' | 'BRAND'; replyPath: string; onUpdated: (t: Ticket) => void }) {
  const t = useTheme();
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<UploadedImage[]>([]);
  const [now] = useState(() => Date.now());
  const left = hoursLeft(ticket, now);

  const send = useMutation({
    mutationFn: () => api.post<Ticket>(replyPath, { text: text.trim(), imageFileIds: photos.length ? photos.map((p) => p.fileId) : undefined }),
    onSuccess: (updated) => {
      haptic.success();
      setText('');
      setPhotos([]);
      onUpdated(updated);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const s = TICKET_STATUS[ticket.status];
  return (
    <>
      <Card style={styles.gap}>
        <View style={styles.between}>
          <Text variant="meta" color="ink3" selectable>
            تذكرة {ticket.number}
          </Text>
          <Badge label={s.label} tone={s.tone} />
        </View>
        <Text variant="bodyStrong">{ticket.subject}</Text>
        <Text variant="meta" color="ink2">
          {TICKET_TYPE_AR[ticket.type]}
          {ticket.orderNumber ? ` · طلب #${ticket.orderNumber}` : ''}
          {me === 'CUSTOMER' && ticket.brandName ? ` · ${ticket.brandName}` : ''}
          {me === 'BRAND' ? ` · ${ticket.userName}` : ''}
        </Text>
      </Card>

      {left != null && (
        <Banner
          icon={Clock}
          tone="warning"
          title={me === 'BRAND' ? `رد على العميل خلال ${left} ساعة` : `المتجر قدامه ${left} ساعة يرد`}
          body={
            me === 'BRAND'
              ? 'لو مردتش في المعاد، دعم فاترينة هيحكم في الشكوى، والحكم ضدك بيتحسب مخالفة على المتجر.'
              : 'لو المتجر مردش في المعاد، دعم فاترينة هيستلم الشكوى ويحكم فيها.'
          }
        />
      )}
      {ticket.status === 'ESCALATED' && <Banner icon={ShieldCheck} title="دعم فاترينة بيراجع الشكوى" body="هنراجع الرسايل والصور ونبلغكم بالحكم." />}
      {ticket.resolution && (
        <Banner
          icon={ShieldCheck}
          tone="success"
          title={
            ticket.resolution.outcome === 'CUSTOMER' ? 'الحكم لصالح العميل' : ticket.resolution.outcome === 'STORE' ? 'الحكم لصالح المتجر' : 'الشكوى اتحلت'
          }
          body={ticket.resolution.note}
        />
      )}

      <View style={styles.gap}>
        {(ticket.messages ?? []).map((m, i) => {
          const mine = m.author === me;
          return (
            <View
              key={m.id ?? i}
              style={[
                styles.bubble,
                {
                  alignSelf: mine ? 'flex-start' : 'flex-end',
                  backgroundColor: mine ? t.c.accentSoft : m.author === 'ADMIN' ? t.c.successSoft : t.c.surface,
                  borderColor: t.c.line,
                  borderRadius: t.radius.lg,
                },
              ]}
            >
              <Text variant="meta" color={m.author === 'ADMIN' ? 'success' : 'ink3'} weight="semibold">
                {mine ? 'إنت' : AUTHOR_AR[m.author]}
              </Text>
              <Text variant="ui" selectable>
                {m.text}
              </Text>
              <PhotoStrip urls={m.images} size={60} />
              <Text variant="meta" color="ink3">
                {formatDate(m.at)}
              </Text>
            </View>
          );
        })}
      </View>

      {isActiveTicket(ticket) && (
        <Card style={styles.gap}>
          <TextField label="ردك" multiline value={text} onChangeText={setText} maxLength={2000} placeholder="اكتب رسالتك" />
          <PhotoRow purpose="CLAIM_IMAGE" value={photos} onChange={setPhotos} max={4} />
          <Button label="ابعت" icon={Send} loading={send.isPending} disabled={!text.trim()} onPress={() => send.mutate()} />
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bubble: { maxWidth: '88%', padding: 12, gap: 4, borderWidth: StyleSheet.hairlineWidth },
});
