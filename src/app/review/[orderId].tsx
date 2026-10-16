import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, ApiError, errorMessage } from '@/api/client';
import { qk, useOrder } from '@/api/queries';
import type { OrderItem } from '@/api/types';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Button, Card, ErrorState, Icon, Screen, Skeleton, StarInput, Text, TextField, toast } from '@/ui';

const RATING_WORD = ['', 'وحش', 'مش أحسن حاجة', 'كويس', 'حلو جداً', 'ممتاز!'];

export default function ReviewOrder() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const q = useOrder(orderId);
  // One review per product, even if the order had several variants of it.
  const products = q.data ? [...new Map(q.data.items.map((i) => [i.productId, i])).values()] : [];

  return (
    <Screen header={<AppBar title="قيّم طلبك" />} keyboard>
      <Text variant="body" color="ink2">
        رأيك بيساعد ناس تانية تختار صح، وبيساعد البراند يتحسن.
      </Text>
      {q.isLoading ? <Skeleton height={240} /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : products.map((item) => <ReviewCard key={item.productId} item={item} orderId={orderId} />)}
      <Button label="خلصت" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

function ReviewCard({ item, orderId }: { item: OrderItem; orderId: string }) {
  const t = useTheme();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: () => api.post(`/products/${item.productId}/reviews`, { orderId, rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      haptic.success();
      setDone(true);
      qc.invalidateQueries({ queryKey: qk.reviews(item.productId) });
      qc.invalidateQueries({ queryKey: qk.myReviews });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'ALREADY_REVIEWED') setDone(true);
      else toast.error(errorMessage(e));
    },
  });

  return (
    <Card style={styles.gap}>
      <View style={styles.head}>
        <Image source={item.imageUrl} style={[styles.thumb, { backgroundColor: t.c.sunken }]} contentFit="cover" />
        <Text variant="ui" weight="semibold" numberOfLines={2} style={styles.flex}>
          {item.title}
        </Text>
      </View>
      {done ? (
        <View style={styles.done}>
          <Icon as={CircleCheck} color="success" />
          <Text variant="ui" color="success" weight="semibold">
            شكراً على تقييمك!
          </Text>
        </View>
      ) : (
        <>
          <StarInput
            value={rating}
            onChange={(v) => {
              haptic.tap();
              setRating(v);
            }}
          />
          <Text variant="ui" color="accent" align="center" style={styles.word}>
            {RATING_WORD[rating] || 'اختار عدد النجوم'}
          </Text>
          {rating > 0 && (
            <>
              <TextField label="اكتب رأيك" optional multiline value={comment} onChangeText={setComment} maxLength={1000} placeholder="الخامة، المقاس، التغليف..." />
              <Button label="نشر التقييم" loading={submit.isPending} onPress={() => submit.mutate()} />
            </>
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 52, height: 64, borderRadius: 8 },
  word: { minHeight: 22 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 8 },
});
