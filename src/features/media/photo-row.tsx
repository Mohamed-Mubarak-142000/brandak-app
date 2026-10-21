import { Image } from 'expo-image';
import { ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import type { UploadPurpose } from '@/api/types';
import { pickImages, uploadFile } from '@/api/upload';
import { ZoomViewer } from '@/features/catalog/gallery';
import type { UploadedImage } from '@/features/seller/image-slot';
import { useTheme } from '@/theme';
import { Icon, Tap, Text, toast } from '@/ui';

const SIZE = 76;

/** A row of up to `max` photos: pick several at once, each uploads right away. */
export function PhotoRow({
  purpose,
  value,
  onChange,
  max = 3,
  label = 'أضف صور',
}: {
  purpose: UploadPurpose;
  value: UploadedImage[];
  onChange: (v: UploadedImage[]) => void;
  max?: number;
  label?: string;
}) {
  const t = useTheme();
  const [busy, setBusy] = useState(0);

  const add = async () => {
    const files = await pickImages({ multiple: true, limit: max - value.length });
    if (!files.length) return;
    setBusy(files.length);
    let next = value;
    for (const file of files.slice(0, max - value.length)) {
      try {
        const res = await uploadFile(file, purpose);
        next = [...next, { fileId: res.id, url: res.url, localUri: file.uri }];
        onChange(next);
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy((b) => b - 1);
      }
    }
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {value.map((img) => (
        <View key={img.fileId} style={[styles.thumb, { borderRadius: t.radius.md, backgroundColor: t.c.sunken }]}>
          <Image source={img.localUri ?? img.url} style={StyleSheet.absoluteFill} contentFit="cover" />
          <Tap
            onPress={() => onChange(value.filter((v) => v.fileId !== img.fileId))}
            style={[styles.remove, { backgroundColor: t.c.overlay }]}
            hitSlop={8}
            accessibilityLabel="شيل الصورة"
          >
            <X size={14} color="#fff" />
          </Tap>
        </View>
      ))}
      {Array.from({ length: busy }).map((_, i) => (
        <View key={`busy-${i}`} style={[styles.thumb, styles.center, { borderRadius: t.radius.md, backgroundColor: t.c.sunken }]}>
          <ActivityIndicator color={t.c.accent} />
        </View>
      ))}
      {value.length + busy < max && (
        <Tap
          onPress={add}
          style={[styles.thumb, styles.center, styles.dashed, { borderRadius: t.radius.md, borderColor: t.c.lineStrong }]}
          accessibilityLabel={label}
        >
          <Icon as={ImagePlus} color="ink3" />
          <Text variant="meta" color="ink3">
            {value.length}/{max}
          </Text>
        </Tap>
      )}
    </ScrollView>
  );
}

/** Read-only thumbnails (review photos, claim photos); tap to view full screen. */
export function PhotoStrip({ urls, size = 64 }: { urls: string[]; size?: number }) {
  const t = useTheme();
  const [zoom, setZoom] = useState<number | null>(null);
  if (!urls.length) return null;
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {urls.map((u, i) => (
          <Tap key={u + i} onPress={() => setZoom(i)} accessibilityLabel={`عرض الصورة ${i + 1}`}>
            <Image source={u} style={{ width: size, height: size, borderRadius: t.radius.sm, backgroundColor: t.c.sunken }} contentFit="cover" />
          </Tap>
        ))}
      </ScrollView>
      <ZoomViewer images={urls} start={zoom} onClose={() => setZoom(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  thumb: { width: SIZE, height: SIZE, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  dashed: { borderWidth: 1.5, borderStyle: 'dashed' },
  remove: { position: 'absolute', top: 4, end: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
