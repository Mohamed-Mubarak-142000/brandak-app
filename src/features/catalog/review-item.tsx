import { BadgeCheck, Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import type { Review } from '@/api/types';
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
    </View>
  );
}

const styles = StyleSheet.create({
  item: { padding: 14, gap: 8, borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stars: { flexDirection: 'row', gap: 1 },
});
