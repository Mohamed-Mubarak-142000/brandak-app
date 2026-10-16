import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAddresses } from '@/api/queries';
import { AddressForm } from '@/features/checkout/address-form';
import { AppBar, Screen, Skeleton, toast } from '@/ui';

export default function EditAddress() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const q = useAddresses();
  const address = id ? q.data?.find((a) => a.id === id) : undefined;

  return (
    <Screen keyboard header={<AppBar title={id ? 'تعديل العنوان' : 'عنوان جديد'} />}>
      {id && q.isLoading ? (
        <Skeleton height={400} />
      ) : (
        <AddressForm
          address={address}
          forceDefault={!id && !q.data?.length}
          onSaved={() => {
            toast.success('اتحفظ العنوان');
            router.back();
          }}
        />
      )}
    </Screen>
  );
}
