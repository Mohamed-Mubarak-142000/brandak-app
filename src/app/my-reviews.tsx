import { useRouter } from 'expo-router';
import { EyeOff } from 'lucide-react-native';
import { View } from 'react-native';

import { flatPages, useMyReviews } from '@/api/queries';
import { ReviewItem } from '@/features/catalog/review-item';
import { AppBar, Banner, Button, EmptyState, ErrorState, Screen, Skeleton, Tap } from '@/ui';

export default function MyReviews() {
  const router = useRouter();
  const q = useMyReviews();
  const items = flatPages(q.data);
  return (
    <Screen header={<AppBar title="تقييماتي" />}>
      {q.isLoading ? (
        <Skeleton height={100} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !items.length ? (
        <EmptyState art="empty" title="لسه مقيّمتش حاجة" body="بعد ما طلبك يوصل، تقدر تقيّم المنتجات من صفحة الطلب." />
      ) : (
        items.map((r) => (
          <View key={r.id} style={{ gap: 6 }}>
            <Tap pressScale={0.99} onPress={() => router.push({ pathname: '/product/[id]', params: { id: r.productId } })}>
              <ReviewItem review={r} />
            </Tap>
            {r.status === 'HIDDEN' && <Banner icon={EyeOff} tone="warning" title="التقييم ده مخفي بعد مراجعة فريقنا" />}
          </View>
        ))
      )}
      {q.hasNextPage && <Button label="تحميل المزيد" variant="secondary" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />}
    </Screen>
  );
}
