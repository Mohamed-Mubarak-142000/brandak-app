import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { BrandOverview } from '@/api/types';
import { formatMoney, formatShortDate } from '@/lib/format';
import { useTheme } from '@/theme';
import { Tap, Text } from '@/ui';

/**
 * Daily sales as columns (one series, one hue). Tap a column to read its value; the table-like
 * readout doubles as the accessible alternative. Bars run oldest → newest in reading order.
 */
export function SalesChart({ daily }: { daily: BrandOverview['daily'] }) {
  const t = useTheme();
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((d) => d.sales));
  const pick = sel ?? daily.length - 1;
  const cur = daily[pick];
  const H = 120;

  if (!daily.length) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.readout}>
        <Text variant="meta" color="ink3">
          {cur ? formatShortDate(cur.date) : ''}
        </Text>
        <Text variant="bodyStrong">
          {cur ? formatMoney(cur.sales) : '—'}{' '}
          <Text variant="meta" color="ink3">
            · {cur?.orders ?? 0} طلب
          </Text>
        </Text>
      </View>
      <View style={[styles.chart, { height: H }]} accessibilityRole="image" accessibilityLabel={`مبيعات ${daily.length} يوم، أعلى يوم ${formatMoney(max)}`}>
        {daily.map((d, i) => {
          const h = Math.max(3, (d.sales / max) * H);
          const active = i === pick;
          return (
            <Tap key={d.date} pressScale={1} onPress={() => setSel(i)} style={styles.col} accessibilityLabel={`${d.date}: ${formatMoney(d.sales)}`}>
              <View style={[styles.bar, { height: h, backgroundColor: active ? t.c.brand : t.c.accentSoft, borderTopStartRadius: 4, borderTopEndRadius: 4 }]} />
            </Tap>
          );
        })}
      </View>
      <View style={[styles.axis, { borderTopColor: t.c.line }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  readout: { gap: 0 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, direction: 'ltr' },
  col: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%' },
  axis: { borderTopWidth: 1 },
});
