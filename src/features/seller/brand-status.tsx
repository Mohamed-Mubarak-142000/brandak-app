import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CircleAlert, Pencil } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { qk } from '@/api/queries';
import type { OwnerBrand } from '@/api/types';
import { haptic } from '@/lib/haptics';
import { AppBar, Banner, Button, Illustration, Screen, Text, toast } from '@/ui';

/** Shown instead of the desk while the brand is under review, rejected or suspended. */
export function BrandStatusScreen({ brand }: { brand: OwnerBrand }) {
  const router = useRouter();
  const qc = useQueryClient();
  const resubmit = useMutation({
    mutationFn: () => api.post<OwnerBrand>('/brands/me/resubmit'),
    onSuccess: (b) => {
      haptic.success();
      qc.setQueryData(qk.myBrand, b);
      toast.success('اتبعت الطلب للمراجعة تاني');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const content = {
    PENDING_REVIEW: {
      art: 'pending' as const,
      title: 'طلبك تحت المراجعة',
      body: `فريق براندك بيراجع "${brand.name}" دلوقتي. عادةً بنرد خلال يوم عمل، وهيوصلك إشعار أول ما نخلص.`,
    },
    REJECTED: {
      art: 'error' as const,
      title: 'محتاجين شوية تعديلات',
      body: 'عدّل بيانات البراند حسب الملاحظة دي، وابعت الطلب تاني.',
    },
    SUSPENDED: {
      art: 'error' as const,
      title: 'البراند موقوف مؤقتاً',
      body: 'البراند مش ظاهر للعملاء حالياً. تواصل مع فريق براندك لمعرفة التفاصيل.',
    },
    ACTIVE: { art: 'success' as const, title: '', body: '' },
  }[brand.status];

  return (
    <Screen
      header={<AppBar title={brand.name} />}
      footer={
        brand.status === 'REJECTED' ? (
          <View style={styles.gap}>
            <Button label="ابعت للمراجعة تاني" loading={resubmit.isPending} onPress={() => resubmit.mutate()} />
            <Button label="تعديل بيانات البراند" icon={Pencil} variant="secondary" onPress={() => router.push('/seller/store')} />
          </View>
        ) : (
          <Button label="رجوع للتسوق" variant="secondary" onPress={() => router.replace('/(tabs)')} />
        )
      }
    >
      <View style={styles.center}>
        <Illustration name={content.art} size={200} />
        <Text variant="page" align="center">
          {content.title}
        </Text>
        <Text variant="body" color="ink2" align="center">
          {content.body}
        </Text>
      </View>
      {brand.statusReason && brand.status !== 'PENDING_REVIEW' && <Banner icon={CircleAlert} tone="warning" title="ملاحظة فريق المراجعة" body={brand.statusReason} />}
      {brand.status === 'PENDING_REVIEW' && (
        <Banner icon={Pencil} title="ممكن تجهّز وقتك" body="أثناء المراجعة تقدر تعدّل بيانات البراند وإعدادات الشحن." action="تعديل" onAction={() => router.push('/seller/store')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  gap: { gap: 10 },
});
