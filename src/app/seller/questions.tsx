import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircleQuestion } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { flatPages, useSellerQuestions } from '@/api/queries';
import type { BrandQuestion } from '@/api/types';
import { StoreReply } from '@/features/catalog/review-item';
import { formatRelative } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Card, Chip, EmptyState, ErrorState, Screen, Sheet, Skeleton, Text, TextField, toast } from '@/ui';

/** Customers' questions on the store's products. Answers show publicly on the product page. */
export default function SellerQuestions() {
  const t = useTheme();
  const qc = useQueryClient();
  const [unanswered, setUnanswered] = useState(true);
  const q = useSellerQuestions(unanswered);
  const items = flatPages(q.data);
  const [target, setTarget] = useState<BrandQuestion | null>(null);
  const [text, setText] = useState('');

  const answer = useMutation({
    mutationFn: () => api.post(`/brand/questions/${target!.id}/answer`, { text: text.trim() }),
    onSuccess: () => {
      haptic.success();
      setTarget(null);
      setText('');
      qc.invalidateQueries({ queryKey: ['seller', 'questions'] });
      toast.success('الإجابة ظهرت على صفحة المنتج');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const open = (item: BrandQuestion) => {
    setTarget(item);
    setText(item.answer ?? '');
  };

  return (
    <Screen
      header={<AppBar title="أسئلة العملاء" />}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
    >
      <Banner icon={MessageCircleQuestion} title="الرد السريع بيبيع" body="إجابتك بتظهر لكل اللي بيشوفوا المنتج، فبتوفر عليك نفس السؤال كل مرة." />
      <View style={styles.row}>
        <Chip label="مستنية رد" selected={unanswered} onPress={() => setUnanswered(true)} />
        <Chip label="الكل" selected={!unanswered} onPress={() => setUnanswered(false)} />
      </View>
      {q.isLoading ? (
        <Skeleton height={100} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !items.length ? (
        <EmptyState art="empty" title={unanswered ? 'مفيش أسئلة مستنية' : 'لسه مفيش أسئلة'} body="أول ما عميل يسأل عن منتج، هيوصلك إشعار." />
      ) : (
        <>
          {items.map((item) => (
            <Card key={item.id} style={styles.gap}>
              <Text variant="meta" color="ink3" numberOfLines={1}>
                {item.productTitle} · {item.userName} · {formatRelative(item.createdAt)}
              </Text>
              <Text variant="ui" weight="semibold">
                {item.text}
              </Text>
              {item.answer && <StoreReply text={item.answer} at={item.answeredAt} label="إجابتك" />}
              <Button label={item.answer ? 'تعديل الإجابة' : 'رد'} size="sm" variant={item.answer ? 'secondary' : 'primary'} block={false} onPress={() => open(item)} />
            </Card>
          ))}
          {q.hasNextPage && <Button label="تحميل المزيد" variant="secondary" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />}
        </>
      )}

      <Sheet
        open={!!target}
        onClose={() => setTarget(null)}
        title="الرد على السؤال"
        footer={<Button label="نشر الإجابة" loading={answer.isPending} disabled={text.trim().length < 2} onPress={() => answer.mutate()} />}
      >
        <Text variant="ui" weight="semibold">
          {target?.text}
        </Text>
        <TextField label="إجابتك" multiline value={text} onChangeText={setText} maxLength={1000} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
});
