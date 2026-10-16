import { MapPin, Phone } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import type { Address } from '@/api/types';
import { formatPhone } from '@/lib/format';
import { useTheme } from '@/theme';
import { Badge, Icon, Text } from '@/ui';

export const addressLine = (a: Pick<Address, 'street' | 'building' | 'floor' | 'apartment' | 'area' | 'city' | 'governorateName'>) =>
  [
    a.street,
    a.building && `عمارة ${a.building}`,
    a.floor && `الدور ${a.floor}`,
    a.apartment && `شقة ${a.apartment}`,
    a.area,
    a.city,
    a.governorateName,
  ]
    .filter(Boolean)
    .join('، ');

export function AddressCard({ address, selected, end }: { address: Address; selected?: boolean; end?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        { borderColor: selected ? t.c.brand : t.c.line, borderWidth: selected ? 2 : 1, backgroundColor: selected ? t.c.accentSoft : t.c.surface, borderRadius: t.radius.md },
      ]}
    >
      <View style={styles.head}>
        <Icon as={MapPin} size={18} color={selected ? 'accent' : 'ink2'} />
        <Text variant="ui" weight="bold" style={styles.flex}>
          {address.label || 'عنوان'}
        </Text>
        {address.isDefault && <Badge label="الافتراضي" tone="neutral" />}
        {end}
      </View>
      <Text variant="ui" color="ink2">
        {address.recipientName}
      </Text>
      <Text variant="meta" color="ink2">
        {addressLine(address)}
      </Text>
      {!!address.landmark && (
        <Text variant="meta" color="ink3">
          {address.landmark}
        </Text>
      )}
      <View style={styles.head}>
        <Icon as={Phone} size={14} color="ink3" />
        <Text variant="meta" color="ink3">
          {formatPhone(address.phone)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
