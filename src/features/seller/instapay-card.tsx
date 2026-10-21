import * as Clipboard from 'expo-clipboard';
import { Copy } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useInstructions } from '@/api/queries';
import { haptic } from '@/lib/haptics';
import { Card, Icon, Tap, Text, toast } from '@/ui';

/** Where to send an InstaPay transfer to Fatrina (commission, paid placements). */
export function InstapayCard() {
  const ins = useInstructions();
  if (!ins.data) return null;

  const copy = async () => {
    await Clipboard.setStringAsync(ins.data!.receiver);
    haptic.tap();
    toast.success('اتنسخ العنوان');
  };

  return (
    <Card style={styles.gap}>
      <Text variant="bodyStrong">حوّل على</Text>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="meta" color="ink3">
            عنوان InstaPay
          </Text>
          <Text variant="bodyStrong" selectable>
            {ins.data.receiver}
          </Text>
        </View>
        <Tap onPress={copy} style={styles.copy} accessibilityLabel="نسخ العنوان">
          <Icon as={Copy} size={18} color="accent" />
          <Text variant="ui" color="accent">
            نسخ
          </Text>
        </Tap>
      </View>
      <Text variant="meta" color="ink2">
        باسم {ins.data.receiverName}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 8 },
});
