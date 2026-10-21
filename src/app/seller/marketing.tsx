import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Copy, Globe, Radar, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { api, API_BASE, errorMessage } from '@/api/client';
import { useMyBrand } from '@/api/queries';
import { haptic } from '@/lib/haptics';
import { AppBar, Banner, Button, Card, Screen, Skeleton, Text, TextField, toast } from '@/ui';

interface Tracking {
  metaPixelId: string;
  hasMetaToken: boolean;
  tiktokPixelId: string;
  hasTiktokToken: boolean;
}

/** The store's web link (for the Instagram/TikTok bio) and its ad pixels. */
export default function Marketing() {
  const qc = useQueryClient();
  const brand = useMyBrand();
  const tracking = useQuery({ queryKey: ['seller', 'tracking'], queryFn: () => api.get<Tracking>('/brand/tracking') });
  // The web page lives at the API host's root: https://host/s/<slug>.
  const link = brand.data ? `${API_BASE.replace(/\/api\/v1$/, '')}/s/${brand.data.slug}` : '';

  return (
    <Screen header={<AppBar title="لينك المتجر والبيكسل" />} keyboard>
      <Card style={styles.gap}>
        <View style={styles.row}>
          <Globe size={20} />
          <Text variant="bodyStrong">صفحة المتجر على الويب</Text>
        </View>
        <Text variant="meta" color="ink3">
          حطها في البايو على إنستجرام وتيك توك. فيها منتجاتك وأسعارك، والعميل يطلب من التطبيق أو على واتساب.
        </Text>
        {brand.isLoading ? (
          <Skeleton height={40} />
        ) : (
          <Text variant="ui" selectable style={styles.ltr}>
            {link}
          </Text>
        )}
        <View style={styles.row}>
          <Button
            label="نسخ"
            icon={Copy}
            variant="soft"
            size="md"
            block={false}
            onPress={async () => {
              await Clipboard.setStringAsync(link);
              haptic.tap();
              toast.success('اتنسخ اللينك');
            }}
          />
          <Button label="مشاركة" icon={Share2} variant="secondary" size="md" block={false} onPress={() => Share.share({ message: link }).catch(() => undefined)} />
        </View>
      </Card>

      {tracking.data ? <PixelForm key={JSON.stringify(tracking.data)} current={tracking.data} onSaved={(d) => qc.setQueryData(['seller', 'tracking'], d)} /> : <Skeleton height={260} />}
    </Screen>
  );
}

function PixelForm({ current, onSaved }: { current: Tracking; onSaved: (t: Tracking) => void }) {
  const [metaId, setMetaId] = useState(current.metaPixelId);
  const [metaToken, setMetaToken] = useState('');
  const [ttId, setTtId] = useState(current.tiktokPixelId);
  const [ttToken, setTtToken] = useState('');

  const save = useMutation({
    mutationFn: () =>
      api.put<Tracking>('/brand/tracking', {
        metaPixelId: metaId.trim(),
        tiktokPixelId: ttId.trim(),
        // Empty token fields keep the saved token.
        metaAccessToken: metaToken.trim() || undefined,
        tiktokAccessToken: ttToken.trim() || undefined,
      }),
    onSuccess: (d) => {
      haptic.success();
      setMetaToken('');
      setTtToken('');
      onSaved(d);
      toast.success('اتحفظ، الأحداث هتوصل لحساباتك الإعلانية');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <Banner
        icon={Radar}
        title="Facebook و TikTok Pixel"
        body="لما حد يشوف منتجك أو يضيفه للسلة أو يطلب، بنبلغ حسابك الإعلاني. كده تعرف إعلانك جاب كام طلب، والإعلان يوصل لناس شبه اللي اشتروا."
      />
      <Card style={styles.gap}>
        <Text variant="bodyStrong">Facebook / Instagram</Text>
        <TextField label="Pixel ID" value={metaId} onChangeText={setMetaId} keyboardType="number-pad" ltr placeholder="1234567890" />
        <TextField label="Conversions API Access Token" value={metaToken} onChangeText={setMetaToken} autoCapitalize="none" ltr placeholder={current.hasMetaToken ? 'محفوظ (اكتب جديد للتغيير)' : 'من Events Manager › Settings'} />
      </Card>
      <Card style={styles.gap}>
        <Text variant="bodyStrong">TikTok</Text>
        <TextField label="Pixel Code" value={ttId} onChangeText={setTtId} autoCapitalize="characters" ltr placeholder="CXXXXXXXXXXXXX" />
        <TextField label="Events API Access Token" value={ttToken} onChangeText={setTtToken} autoCapitalize="none" ltr placeholder={current.hasTiktokToken ? 'محفوظ (اكتب جديد للتغيير)' : 'من Events Manager › Settings'} />
      </Card>
      <Button label="حفظ" loading={save.isPending} onPress={() => save.mutate()} />
    </>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ltr: { writingDirection: 'ltr', textAlign: 'left' },
});
