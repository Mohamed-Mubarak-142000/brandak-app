import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircleQuestion } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { flatPages, qk, useQuestions } from '@/api/queries';
import type { Question } from '@/api/types';
import { useRequireAuth } from '@/auth/use-auth';
import { formatRelative } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Badge, Button, Icon, Sheet, Skeleton, Tap, Text, TextField, toast } from '@/ui';
import { StoreReply } from './review-item';

/** "Ask before you buy": answered questions for everyone, plus an ask button. */
export function QuestionsSection({ productId, canAsk }: { productId: string; canAsk: boolean }) {
  const q = useQuestions(productId);
  const qc = useQueryClient();
  const requireAuth = useRequireAuth();
  const [askOpen, setAskOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [text, setText] = useState('');
  const items = flatPages(q.data);
  const total = q.data?.pages[0]?.meta.total ?? 0;

  const ask = useMutation({
    mutationFn: () => api.post<Question>(`/products/${productId}/questions`, { text: text.trim() }),
    onSuccess: () => {
      haptic.success();
      setAskOpen(false);
      setText('');
      qc.invalidateQueries({ queryKey: qk.questions(productId) });
      toast.success('سؤالك وصل للمتجر، هيوصلك إشعار لما يرد');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <View style={styles.gap}>
      <View style={styles.between}>
        <Text variant="section">أسئلة عن المنتج {total ? `(${total})` : ''}</Text>
        {total > 3 && (
          <Tap onPress={() => setAllOpen(true)} hitSlop={10} pressScale={1}>
            <Text variant="ui" color="accent">
              عرض الكل
            </Text>
          </Tap>
        )}
      </View>
      {q.isLoading ? (
        <Skeleton height={70} />
      ) : items.length ? (
        items.slice(0, 3).map((item) => <QuestionItem key={item.id} q={item} />)
      ) : (
        <Text variant="ui" color="ink3">
          محتار في المقاس أو الخامة؟ اسأل المتجر والإجابة هتظهر هنا للكل.
        </Text>
      )}
      {canAsk && (
        <Button
          label="اسأل المتجر"
          icon={MessageCircleQuestion}
          variant="secondary"
          onPress={() => requireAuth('سجّل عشان تسأل المتجر.', () => setAskOpen(true))}
        />
      )}

      <Sheet
        open={askOpen}
        onClose={() => setAskOpen(false)}
        title="اسأل المتجر"
        footer={<Button label="ابعت السؤال" loading={ask.isPending} disabled={text.trim().length < 5} onPress={() => ask.mutate()} />}
      >
        <TextField label="سؤالك" multiline value={text} onChangeText={setText} maxLength={300} placeholder="المقاس L يناسب وزن 80 كيلو؟" />
        <Text variant="meta" color="ink3">
          السؤال والإجابة بيظهروا للناس باسمك الأول بس. متكتبش رقم موبايلك.
        </Text>
      </Sheet>
      <Sheet open={allOpen} onClose={() => setAllOpen(false)} title="كل الأسئلة">
        {items.map((item) => (
          <QuestionItem key={item.id} q={item} />
        ))}
        {q.hasNextPage && <Button label="تحميل المزيد" variant="secondary" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />}
      </Sheet>
    </View>
  );
}

export function QuestionItem({ q }: { q: Question }) {
  const t = useTheme();
  return (
    <View style={[styles.item, { borderColor: t.c.line, backgroundColor: t.c.surface, borderRadius: t.radius.md }]}>
      <View style={styles.inline}>
        <Icon as={MessageCircleQuestion} size={16} color="accent" />
        <Text variant="ui" weight="semibold" style={styles.flex}>
          {q.text}
        </Text>
        {!q.answer && q.mine && <Badge label="مستني الرد" tone="warning" />}
      </View>
      <Text variant="meta" color="ink3">
        {q.userName} · {formatRelative(q.createdAt)}
      </Text>
      {q.answer && <StoreReply text={q.answer} at={q.answeredAt} label="إجابة المتجر" />}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  flex: { flex: 1 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  item: { padding: 14, gap: 6, borderWidth: 1 },
});
