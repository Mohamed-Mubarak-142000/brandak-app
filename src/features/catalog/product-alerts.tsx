import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, TrendingDown } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { useSession } from '@/auth/session';
import { useRequireAuth } from '@/auth/use-auth';
import type { Wholesale } from '@/api/types';
import { formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Button, Text, toast } from '@/ui';

type Alert = { type: 'PRICE_DROP' | 'BACK_IN_STOCK'; variantId: string | null; price: number | null };

/** "Tell me when it's back" for a sold-out choice, and "tell me if the price drops". */
export function ProductAlerts({ productId, variantId, soldOut }: { productId: string; variantId: string | null; soldOut: boolean }) {
  const qc = useQueryClient();
  const authed = useSession((s) => s.status === 'authed');
  const requireAuth = useRequireAuth();
  const key = ['alerts', productId];
  const mine = useQuery({ queryKey: key, queryFn: () => api.get<Alert[]>(`/products/${productId}/alerts/me`), enabled: authed });
  const has = (type: Alert['type'], v: string | null) => (mine.data ?? []).some((a) => a.type === type && (type === 'PRICE_DROP' || a.variantId === v));

  const toggle = useMutation({
    mutationFn: ({ type, on }: { type: Alert['type']; on: boolean }) => {
      const body = { type, variantId: type === 'BACK_IN_STOCK' ? (variantId ?? undefined) : undefined };
      return on ? api.post(`/products/${productId}/alerts`, body) : api.post(`/products/${productId}/alerts/remove`, body);
    },
    onSuccess: (_d, v) => {
      haptic.success();
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['alerts', 'me'] });
      if (v.on) toast.success(v.type === 'PRICE_DROP' ? 'هنبلغك أول ما السعر ينزل' : 'هنبلغك أول ما يرجع متوفر');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const run = (type: Alert['type'], on: boolean) => requireAuth('سجّل عشان نبلغك.', () => toggle.mutate({ type, on }));
  const stockOn = has('BACK_IN_STOCK', variantId);
  const priceOn = has('PRICE_DROP', null);

  return (
    <View style={styles.row}>
      {soldOut && (
        <Button
          label={stockOn ? 'هنبلغك لما يرجع' : 'بلغني لما يرجع'}
          icon={BellRing}
          variant={stockOn ? 'soft' : 'secondary'}
          size="md"
          block={false}
          loading={toggle.isPending && toggle.variables?.type === 'BACK_IN_STOCK'}
          onPress={() => run('BACK_IN_STOCK', !stockOn)}
          style={styles.flex}
        />
      )}
      <Button
        label={priceOn ? 'بنتابع السعر' : 'بلغني لو السعر نزل'}
        icon={TrendingDown}
        variant={priceOn ? 'soft' : 'secondary'}
        size="md"
        block={false}
        loading={toggle.isPending && toggle.variables?.type === 'PRICE_DROP'}
        onPress={() => run('PRICE_DROP', !priceOn)}
        style={styles.flex}
      />
    </View>
  );
}

/** Quantity price table for wholesale products. */
export function WholesaleTable({ wholesale, price }: { wholesale: Wholesale; price: number }) {
  const t = useTheme();
  const rows = [{ minQty: wholesale.minQty, price }, ...wholesale.tiers].filter((r, i, all) => i === 0 || r.minQty > all[0].minQty);
  return (
    <View style={[styles.table, { borderColor: t.c.line, borderRadius: t.radius.md, backgroundColor: t.c.sunken }]}>
      <Text variant="ui" weight="bold">
        أسعار الجملة
      </Text>
      {rows.map((r, i) => (
        <View key={r.minQty} style={styles.between}>
          <Text variant="ui" color="ink2">
            {i === 0 ? (wholesale.minQty > 1 ? `من ${r.minQty} قطع` : 'القطعة') : `من ${r.minQty} قطعة`}
          </Text>
          <Text variant="ui" weight="semibold" color={i ? 'success' : 'ink'}>
            {formatMoney(r.price)} للقطعة
          </Text>
        </View>
      ))}
      <Text variant="meta" color="ink3">
        كل المقاسات والألوان بتتحسب مع بعض في الكمية.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  table: { gap: 6, padding: 12, borderWidth: StyleSheet.hairlineWidth },
});
