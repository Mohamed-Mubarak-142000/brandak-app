import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Ban, ChevronLeft, MessageCircleQuestion, ShieldAlert, Star, Undo2, Users } from 'lucide-react-native';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { DeskHeader } from '@/features/seller/desk-header';
import { useSellerTodo } from '@/features/seller/todo-card';
import { useTheme } from '@/theme';
import { Card, Icon, Tap, Text } from '@/ui';

/** Everything customers send the store: complaints, returns, questions, reviews. */
export default function Inbox() {
  const t = useTheme();
  const router = useRouter();
  const todo = useSellerTodo();
  const d = todo.data;

  const rows: { label: string; hint: string; icon: typeof Star; href: Href; n?: number; urgent?: boolean }[] = [
    { label: 'شكاوى العملاء', hint: 'رد خلال 48 ساعة، وإلا فاترينة بتحكم', icon: ShieldAlert, href: '/seller/complaints', n: d?.complaints, urgent: true },
    { label: 'المرتجعات', hint: 'وافق أو ارفض، وسجّل الاستلام والاسترداد', icon: Undo2, href: '/seller/returns', n: d?.returns },
    { label: 'أسئلة العملاء', hint: 'إجابتك بتظهر للكل في صفحة المنتج', icon: MessageCircleQuestion, href: '/seller/questions', n: d?.questions },
    { label: 'التقييمات والردود', hint: 'رد على اللي قيّموك', icon: Star, href: '/seller/reviews', n: d?.reviews },
    { label: 'عملائي', hint: 'مين بيشتري منك وبكام', icon: Users, href: '/seller/customers' },
    { label: 'العملاء المحظورين', hint: 'اللي منعتهم يطلبوا منك', icon: Ban, href: '/seller/blocks' },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <DeskHeader title="العملاء" subtitle="الشكاوى والمرتجعات والأسئلة" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={todo.isRefetching} onRefresh={() => void todo.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
      >
        {rows.map((r) => (
          <Tap key={r.label} onPress={() => router.push(r.href)} pressScale={0.99} accessibilityLabel={r.n ? `${r.label}، ${r.n} جديد` : r.label}>
            <Card style={styles.row}>
              <View style={[styles.icon, { backgroundColor: r.urgent && r.n ? t.c.dangerSoft : t.c.accentSoft }]}>
                <Icon as={r.icon} color={r.urgent && r.n ? 'danger' : 'accent'} />
              </View>
              <View style={styles.flex}>
                <Text variant="ui" weight="semibold">
                  {r.label}
                </Text>
                <Text variant="meta" color="ink3">
                  {r.hint}
                </Text>
              </View>
              {!!r.n && (
                <View style={[styles.count, { backgroundColor: r.urgent ? t.c.danger : t.c.accent }]}>
                  <Text variant="meta" weight="bold" style={styles.white}>
                    {r.n}
                  </Text>
                </View>
              )}
              <Icon as={ChevronLeft} color="ink3" />
            </Card>
          </Tap>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  count: { minWidth: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  white: { color: '#fff' },
});
