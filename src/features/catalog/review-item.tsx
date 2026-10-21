import { BadgeCheck, Star, Store } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import type { Review } from '@/api/types';
import { PhotoStrip } from '@/features/media/photo-row';
import { formatRelative } from '@/lib/format';
import { useTheme } from '@/theme';
import { Text } from '@/ui';

export function ReviewItem({ review }: { review: Review }) {
  const t = useTheme();
  return (
    <View style={[styles.item, { borderColor: t.c.line, backgroundColor: t.c.surface, borderRadius: t.radius.md }]}>
      <View style={styles.head}>
        <View style={[styles.avatar, { backgroundColor: t.c.accentSoft }]}>
          <Text variant="ui" weight="bold" color="accent">
            {review.userName.trim().charAt(0) || '؟'}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="ui" weight="semibold">
            {review.userName}
          </Text>
          <View style={styles.inline}>
            <BadgeCheck size={13} color={t.c.success} />
            <Text variant="meta" color="success">
              اشترى واستلم
            </Text>
            <Text variant="meta" color="ink3">
              · {formatRelative(review.createdAt)}
            </Text>
          </View>
        </View>
        <View style={styles.stars} accessibilityLabel={`${review.rating} من 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={13} color={t.c.brand} fill={n <= review.rating ? t.c.brand : 'none'} />
          ))}
        </View>
      </View>
      {!!review.comment && (
        <Text variant="ui" color="ink2">
          {review.comment}
        </Text>
      )}
      <PhotoStrip urls={review.images ?? []} />
      {review.reply && <StoreReply text={review.reply.text} at={review.reply.at} />}
    </View>
  );
}

/** The store's public answer under a review or question. */
export function StoreReply({ text, at, label = 'رد المتجر' }: { text: string; at?: string | null; label?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.reply, { backgroundColor: t.c.sunken, borderRadius: t.radius.md, borderStartColor: t.c.accent }]}>
      <View style={styles.inline}>
        <Store size={13} color={t.c.accent} />
        <Text variant="meta" color="accent" weight="semibold">
          {label}
        </Text>
        {!!at && (
          <Text variant="meta" color="ink3">
            · {formatRelative(at)}
          </Text>
        )}
      </View>
      <Text variant="ui" color="ink2">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  reply: { padding: 10, gap: 4, borderStartWidth: 3 },
  item: { padding: 14, gap: 8, borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stars: { flexDirection: 'row', gap: 1 },
});
