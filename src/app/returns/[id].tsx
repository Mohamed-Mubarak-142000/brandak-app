import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Info, LifeBuoy } from 'lucide-react-native';
import { Alert, RefreshControl } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { qk, useMyReturn } from '@/api/queries';
import type { ReturnRequest } from '@/api/types';
import { ReturnDetails } from '@/features/returns/return-view';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, ErrorState, Screen, Skeleton, toast } from '@/ui';

const NEXT_STEP: Partial<Record<ReturnRequest['status'], string>> = {
  REQUESTED: 'المتجر هيراجع طلبك ويرد عليك، وهيوصلك إشعار.',
  APPROVED: 'جهّز المنتجات بحالتها وتغليفها. المتجر هيتواصل معاك عشان يستلمها.',
  RECEIVED: 'المتجر استلم المنتجات، وهيرجعلك الفلوس قريب.',
  REJECTED: 'لو شايف إن الرفض مش في محله، افتح شكوى ودعم فاترينة هيراجعها.',
};

export default function ReturnScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useMyReturn(id);
  const r = q.data;

  const cancel = useMutation({
    mutationFn: () => api.post<ReturnRequest>(`/returns/me/${id}/cancel`),
    onSuccess: (data) => {
      qc.setQueryData(qk.returnOne(id), data);
      qc.invalidateQueries({ queryKey: qk.returns });
      toast.success('اتلغى طلب الإرجاع');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Screen
      header={<AppBar title="طلب الإرجاع" />}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
      footer={
        r && (r.status === 'REQUESTED' || r.status === 'APPROVED') ? (
          <Button
            label="إلغاء طلب الإرجاع"
            variant="secondary"
            loading={cancel.isPending}
            onPress={() =>
              Alert.alert('إلغاء طلب الإرجاع؟', 'هتحتاج تعمل طلب جديد لو غيّرت رأيك.', [
                { text: 'رجوع', style: 'cancel' },
                { text: 'إلغاء الطلب', style: 'destructive', onPress: () => cancel.mutate() },
              ])
            }
          />
        ) : r?.status === 'REJECTED' ? (
          <Button label="افتح شكوى لدعم فاترينة" icon={LifeBuoy} variant="secondary" onPress={() => router.push({ pathname: '/support/new', params: { orderId: r.orderId } })} />
        ) : undefined
      }
    >
      {q.isLoading ? (
        <Skeleton height={260} />
      ) : q.error || !r ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          {NEXT_STEP[r.status] && <Banner icon={Info} tone={r.status === 'REJECTED' ? 'warning' : undefined} title="الخطوة الجاية" body={NEXT_STEP[r.status]!} />}
          <ReturnDetails r={r} />
        </>
      )}
    </Screen>
  );
}
