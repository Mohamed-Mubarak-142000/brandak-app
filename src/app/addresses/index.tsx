import { useRouter } from 'expo-router';
import { Pencil, Plus, Trash2 } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useAddresses, useDeleteAddress } from '@/api/queries';
import { AddressCard } from '@/features/checkout/address-card';
import { AppBar, Button, EmptyState, ErrorState, IconButton, Screen, Skeleton, toast } from '@/ui';

export default function Addresses() {
  const router = useRouter();
  const q = useAddresses();
  const del = useDeleteAddress();

  const confirmDelete = (id: string) =>
    Alert.alert('حذف العنوان؟', 'مش هتقدر ترجعه بعد الحذف.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => del.mutate(id, { onError: (e) => toast.error(errorMessage(e)), onSuccess: () => toast.info('اتحذف العنوان') }) },
    ]);

  return (
    <Screen
      header={<AppBar title="عناويني" />}
      footer={q.data?.length ? <Button label="إضافة عنوان جديد" icon={Plus} onPress={() => router.push('/addresses/edit')} /> : undefined}
    >
      {q.isLoading ? (
        <>
          <Skeleton height={120} radius={12} />
          <Skeleton height={120} radius={12} />
        </>
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState art="address" title="مفيش عناوين لسه" body="ضيف عنوانك مرة واحدة واستخدمه في كل طلباتك." action="إضافة عنوان" onAction={() => router.push('/addresses/edit')} />
      ) : (
        q.data.map((a) => (
          <AddressCard
            key={a.id}
            address={a}
            end={
              <View style={styles.actions}>
                <IconButton icon={Pencil} label="تعديل" size={36} color="ink2" onPress={() => router.push({ pathname: '/addresses/edit', params: { id: a.id } })} />
                <IconButton icon={Trash2} label="حذف" size={36} color="danger" onPress={() => confirmDelete(a.id)} />
              </View>
            }
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row' } });
