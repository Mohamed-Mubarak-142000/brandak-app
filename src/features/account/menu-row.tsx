import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme, type Palette } from '@/theme';
import { Icon, Tap, Text } from '@/ui';

export function MenuGroup({ title, children }: { title?: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.group}>
      {title && (
        <Text variant="meta" color="ink3" weight="semibold" style={styles.groupTitle}>
          {title}
        </Text>
      )}
      <View style={[styles.box, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.lg }]}>{children}</View>
    </View>
  );
}

export function MenuRow({
  icon,
  label,
  value,
  onPress,
  tone = 'ink',
  end,
  last,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  onPress?: () => void;
  tone?: keyof Palette;
  end?: ReactNode;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Tap onPress={onPress} pressScale={1} disabled={!onPress} style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.c.line }]} accessibilityLabel={value ? `${label}، ${value}` : label}>
      <View style={[styles.iconBox, { backgroundColor: tone === 'danger' ? t.c.dangerSoft : t.c.sunken }]}>
        <Icon as={icon} size={19} color={tone === 'danger' ? 'danger' : 'ink2'} />
      </View>
      <Text variant="body" color={tone} style={styles.flex}>
        {label}
      </Text>
      {value && (
        <Text variant="ui" color="ink3">
          {value}
        </Text>
      )}
      {end ?? (onPress && <Icon as={ChevronLeft} size={18} color="ink3" />)}
    </Tap>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  groupTitle: { paddingHorizontal: 4 },
  box: { borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
