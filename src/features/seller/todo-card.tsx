import { useQuery } from '@tanstack/react-query';
import type { Href } from 'expo-router';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ChevronLeft, CircleCheck, MessageCircleQuestion, PackageCheck, ShieldAlert, Star, Undo2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { useTheme } from '@/theme';
import { Card, Icon, Tap, Text } from '@/ui';

const total = async (path: string, query: Record<string, string | number | boolean>) => (await api.page(path, { ...query, limit: 1 })).meta.total;

/** Everything waiting for the store, in one place, most urgent first. */
export function useSellerTodo() {
  return useQuery({
    queryKey: ['seller', 'todo'],
    queryFn: async () => {
      const [complaints, orders, returns, questions, reviews] = await Promise.all([
        total('/brand/tickets', { status: 'WAITING_STORE' }),
        total('/brand/orders', { status: 'PENDING' }),
        total('/brand/returns', { status: 'REQUESTED' }),
        total('/brand/questions', { unanswered: true }),
        total('/brand/reviews', { unanswered: true }),
      ]);
      return { complaints, orders, returns, questions, reviews };
    },
    refetchInterval: 120_000,
  });
}

export function TodoCard() {
  const t = useTheme();
  const router = useRouter();
  const q = useSellerTodo();
  // Back from answering a question or a return: the counts update right away.
  const { refetch } = q;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const d = q.data;
  if (!d) return null;

  const all: { n: number; label: string; hint: string; icon: typeof Star; href: Href; urgent?: boolean }[] = [
    { n: d.complaints, label: 'شكوى مستنية ردك', hint: 'رد خلال 48 ساعة', icon: ShieldAlert, href: '/seller/complaints', urgent: true },
    { n: d.orders, label: 'طلب جديد محتاج تأكيد', hint: 'أكّد عشان العميل يطمّن', icon: PackageCheck, href: { pathname: '/seller/orders', params: { status: 'PENDING' } }, urgent: true },
    { n: d.returns, label: 'طلب إرجاع', hint: 'وافق أو ارفض', icon: Undo2, href: '/seller/returns' },
    { n: d.questions, label: 'سؤال من عميل', hint: 'الرد السريع بيبيع', icon: MessageCircleQuestion, href: '/seller/questions' },
    { n: d.reviews, label: 'تقييم من غير رد', hint: 'اشكر عميلك', icon: Star, href: '/seller/reviews' },
  ];
  const rows = all.filter((r) => r.n > 0);

  if (!rows.length) {
    return (
      <Card style={styles.done}>
        <Icon as={CircleCheck} color="success" />
        <Text variant="ui" color="success" weight="semibold">
          مفيش حاجة مستنياك دلوقتي
        </Text>
      </Card>
    );
  }

  return (
    <Card padded={false} style={styles.card}>
      <Text variant="bodyStrong" style={styles.title}>
        محتاج منك دلوقتي
      </Text>
      {rows.map((r, i) => (
        <Tap key={r.label} onPress={() => router.push(r.href)} pressScale={0.99} accessibilityLabel={`${r.n} ${r.label}`} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.c.line }]}>
          <View style={[styles.count, { backgroundColor: r.urgent ? t.c.dangerSoft : t.c.accentSoft }]}>
            <Text variant="ui" weight="bold" color={r.urgent ? 'danger' : 'accent'}>
              {r.n}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text variant="ui" weight="semibold">
              {r.label}
            </Text>
            <Text variant="meta" color="ink3">
              {r.hint}
            </Text>
          </View>
          <Icon as={r.icon} size={18} color="ink3" />
          <Icon as={ChevronLeft} size={18} color="ink3" />
        </Tap>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { overflow: 'hidden' },
  title: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
  count: { minWidth: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
