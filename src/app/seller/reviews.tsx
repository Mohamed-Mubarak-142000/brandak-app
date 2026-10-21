import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { flatPages, useSellerReviews } from '@/api/queries';
import type { BrandReview } from '@/api/types';
import { ReviewItem } from '@/features/catalog/review-item';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Chip, EmptyState, ErrorState, Screen, Sheet, Skeleton, Text, TextField, toast } from '@/ui';

/** Reviews on the store's products; the store replies publicly (and can edit its reply). */
export default function SellerReviews() {
  const t = useTheme();
  const qc = useQueryClient();
  const [unanswered, setUnanswered] = useState(true);
  const q = useSellerReviews(unanswered);
  const items = flatPages(q.data);
  const [target, setTarget] = useState<BrandReview | null>(null);
  const [text, setText] = useState('');

  const reply = useMutation({
    mutationFn: () => api.post(`/brand/reviews/${target!.id}/reply`, { text: text.trim() }),
    onSuccess: () => {
      haptic.success();
      setTarget(null);
      setText('');
      qc.invalidateQueries({ queryKey: ['seller', 'reviews'] });
      toast.success('ردك ظهر تحت التقييم');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Screen
      header={<AppBar title="التقييمات والردود" />}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
    >
      <Banner icon={Star} title="رد على عملائك" body="شكرك للتقييم الحلو، أو اعتذارك وحلك للمشكلة، بيبني ثقة للي لسه هيشتري." />
      <View style={styles.row}>
        <Chip label="من غير رد" selected={unanswered} onPress={() => setUnanswered(true)} />
        <Chip label="الكل" selected={!unanswered} onPress={() => setUnanswered(false)} />
      </View>
      {q.isLoading ? (
        <Skeleton height={100} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !items.length ? (
        <EmptyState art="empty" title={unanswered ? 'رديت على كل التقييمات' : 'لسه مفيش تقييمات'} body="التقييمات بتيجي من عملاء استلموا طلباتهم." />
      ) : (
        <>
          {items.map((r) => (
            <View key={r.id} style={styles.gap}>
              <Text variant="meta" color="ink3" numberOfLines={1}>
                {r.productTitle}
              </Text>
              <ReviewItem review={r} />
              <Button label={r.reply ? 'تعديل الرد' : 'رد على التقييم'} size="sm" variant="soft" block={false} onPress={() => { setTarget(r); setText(r.reply?.text ?? ''); }} />
            </View>
          ))}
          {q.hasNextPage && <Button label="تحميل المزيد" variant="secondary" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />}
        </>
      )}

      <Sheet
        open={!!target}
        onClose={() => setTarget(null)}
        title="الرد على التقييم"
        footer={<Button label="نشر الرد" loading={reply.isPending} disabled={text.trim().length < 2} onPress={() => reply.mutate()} />}
      >
        <Text variant="meta" color="ink3">
          الرد بيظهر للكل تحت التقييم، والعميل بيوصله إشعار.
        </Text>
        <TextField label="ردك" multiline value={text} onChangeText={setText} maxLength={500} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
});
