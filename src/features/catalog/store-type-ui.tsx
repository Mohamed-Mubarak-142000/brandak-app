import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import type { StoreType } from '@/api/types';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Icon, Tap, Text } from '@/ui';
import { STORE_TYPES, storeTypeInfo } from './store-types';

/** Small pill: icon + "معرض". */
export function StoreTypeBadge({ type }: { type?: StoreType | null }) {
  const t = useTheme();
  const info = storeTypeInfo(type);
  return (
    <View style={[styles.badge, { backgroundColor: t.c.accentSoft }]} accessibilityLabel={`نوع المتجر: ${info.label}`}>
      <Icon as={info.icon} size={13} color="accent" />
      <Text variant="meta" weight="semibold" color="accent">
        {info.label}
      </Text>
    </View>
  );
}

/** Big selectable cards (2×2) used when opening or editing a store. */
export function StoreTypePicker({ value, onChange, error }: { value: StoreType | null; onChange: (t: StoreType) => void; error?: string }) {
  const t = useTheme();
  return (
    <View style={styles.gap}>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {STORE_TYPES.map((s) => {
          const on = value === s.type;
          return (
            <Tap
              key={s.type}
              onPress={() => {
                haptic.tap();
                onChange(s.type);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${s.label}: ${s.description}`}
              style={[
                styles.card,
                {
                  borderColor: on ? t.c.brand : error ? t.c.danger : t.c.line,
                  borderWidth: on ? 2 : 1,
                  backgroundColor: on ? t.c.accentSoft : t.c.surface,
                  borderRadius: t.radius.lg,
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: on ? t.c.surface : t.c.sunken }]}>
                <Icon as={s.icon} size={24} color={on ? 'accent' : 'ink2'} />
              </View>
              <Text variant="bodyStrong" color={on ? 'accent' : 'ink'}>
                {s.label}
              </Text>
              <Text variant="meta" color="ink2">
                {s.description}
              </Text>
              {on && (
                <View style={[styles.check, { backgroundColor: t.c.brand }]}>
                  <Check size={14} color="#fff" strokeWidth={3} />
                </View>
              )}
            </Tap>
          );
        })}
      </View>
      {error && (
        <Text variant="meta" color="danger">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { flexBasis: '47%', flexGrow: 1, padding: 14, gap: 6, minHeight: 150 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  check: { position: 'absolute', top: 10, end: 10, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
