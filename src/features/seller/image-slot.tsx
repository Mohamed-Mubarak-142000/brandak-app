import { Image } from 'expo-image';
import { ImagePlus, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type DimensionValue } from 'react-native';

import { errorMessage } from '@/api/client';
import type { UploadPurpose } from '@/api/types';
import { pickImages, uploadFile } from '@/api/upload';
import { useTheme } from '@/theme';
import { Icon, Tap, Text, toast } from '@/ui';

export interface UploadedImage {
  fileId: string;
  url: string | null;
  localUri?: string;
}

/** Tap to pick → uploads immediately → returns the file id for the form. */
export function ImageSlot({
  label,
  purpose,
  value,
  onChange,
  aspect = [1, 1],
  width = 120,
  height,
  round,
}: {
  label: string;
  purpose: UploadPurpose;
  value: UploadedImage | null;
  onChange: (v: UploadedImage) => void;
  aspect?: [number, number];
  width?: DimensionValue;
  height?: number;
  round?: boolean;
}) {
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  const h = height ?? (typeof width === 'number' ? (width * aspect[1]) / aspect[0] : 120);

  const pick = async () => {
    const [file] = await pickImages({ aspect });
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadFile(file, purpose);
      onChange({ fileId: res.id, url: res.url, localUri: file.uri });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const src = value?.localUri ?? value?.url;
  return (
    <Tap
      onPress={pick}
      disabled={busy}
      pressScale={0.98}
      accessibilityLabel={value ? `تغيير ${label}` : `رفع ${label}`}
      style={[
        styles.slot,
        {
          width,
          height: h,
          borderRadius: round ? h / 2 : t.radius.md,
          borderColor: value ? t.c.line : t.c.lineStrong,
          backgroundColor: t.c.sunken,
        },
      ]}
    >
      {src ? <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      {busy ? (
        <View style={[styles.cover, { backgroundColor: t.c.overlay }]}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : !src ? (
        <View style={styles.empty}>
          <Icon as={ImagePlus} color="ink3" size={26} />
          <Text variant="meta" color="ink3" align="center">
            {label}
          </Text>
        </View>
      ) : (
        <View style={[styles.badge, { backgroundColor: t.c.surface }]}>
          <Icon as={RefreshCw} size={14} color="ink2" />
        </View>
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  slot: { overflow: 'hidden', borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  cover: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 6, padding: 8 },
  badge: { position: 'absolute', bottom: 6, end: 6, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
