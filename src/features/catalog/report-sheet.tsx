import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import type { ReportReason, ReportTarget } from '@/api/types';
import { haptic } from '@/lib/haptics';
import { Button, Chip, Sheet, Text, TextField, toast } from '@/ui';

const REASONS: Record<ReportReason, string> = {
  FAKE: 'منتج مقلّد أو مزيّف',
  FRAUD: 'نصب أو احتيال',
  PROHIBITED_PRODUCT: 'منتج ممنوع',
  OFFENSIVE: 'محتوى مسيء',
  SPAM: 'سبام أو إعلان',
  OTHER: 'سبب تاني',
};

const TARGET_LABEL: Record<ReportTarget, string> = { PRODUCT: 'المنتج', BRAND: 'المتجر', REVIEW: 'التقييم' };

export function ReportSheet({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: ReportTarget; targetId: string }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  const report = useMutation({
    mutationFn: () => api.post('/reports', { targetType, targetId, reason, details: details.trim() || undefined }),
    onSuccess: () => {
      haptic.success();
      toast.success('شكراً! فريقنا هيراجع البلاغ في أقرب وقت');
      setReason(null);
      setDetails('');
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`الإبلاغ عن ${TARGET_LABEL[targetType]}`}
      footer={<Button label="إرسال البلاغ" variant="danger" disabled={!reason} loading={report.isPending} onPress={() => report.mutate()} />}
    >
      <Text variant="ui" color="ink2">
        البلاغات سرية. اختار السبب الأقرب:
      </Text>
      <View style={styles.wrap}>
        {(Object.keys(REASONS) as ReportReason[]).map((r) => (
          <Chip key={r} label={REASONS[r]} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      <TextField label="تفاصيل" optional multiline value={details} onChangeText={setDetails} maxLength={500} placeholder="احكيلنا حصل إيه..." />
    </Sheet>
  );
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
