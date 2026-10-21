import { Timer } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Icon, Text } from '@/ui';

const pad = (n: number) => String(n).padStart(2, '0');

/** "باقي 2 يوم 05:12:09" — ticks every second while the sale runs, hides itself after. */
export function useCountdown(endsAt: string | null | undefined) {
  const end = endsAt ? new Date(endsAt).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!end) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [end]);
  const left = Math.max(0, end - now);
  if (!end || left === 0) return null;
  const s = Math.floor(left / 1000);
  const days = Math.floor(s / 86_400);
  const clock = `${pad(Math.floor((s % 86_400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return { days, clock, label: days > 0 ? `${days} يوم ${clock}` : clock, urgent: left < 24 * 3_600_000 };
}

/** Compact timer pill for sale cards and the product page. */
export function Countdown({ endsAt, prefix = 'العرض بيخلص خلال' }: { endsAt: string | null | undefined; prefix?: string }) {
  const t = useTheme();
  const c = useCountdown(endsAt);
  if (!c) return null;
  return (
    <View
      style={[styles.pill, { backgroundColor: c.urgent ? t.c.dangerSoft : t.c.accentSoft, borderRadius: t.radius.pill }]}
      accessibilityLabel={`${prefix} ${c.days ? `${c.days} يوم و` : ''}${c.clock}`}
    >
      <Icon as={Timer} size={14} color={c.urgent ? 'danger' : 'accent'} />
      <Text variant="meta" weight="semibold" color={c.urgent ? 'danger' : 'accent'} style={styles.digits}>
        {prefix} {c.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  digits: { fontVariant: ['tabular-nums'] },
});
