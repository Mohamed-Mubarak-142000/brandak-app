import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BadgeCheck } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PublicBrand } from '@/api/types';
import { useTheme } from '@/theme';
import { Rating, Tap, Text } from '@/ui';
import { BrandMark } from '@/ui/brand-mark';
import { StoreTypeBadge } from './store-type-ui';

export function BrandLogo({ uri, size = 48, name }: { uri: string | null | undefined; size?: number; name?: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: t.c.accentSoft,
        borderWidth: 2,
        borderColor: t.c.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityLabel={name ? `لوجو ${name}` : undefined}
    >
      {uri ? <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : <BrandMark size={size * 0.5} />}
    </View>
  );
}

/** Wide card with cover + logo — used in the hero rail and brand lists. */
export const BrandCard = memo(function BrandCard({ brand, width }: { brand: PublicBrand; width: number }) {
  const t = useTheme();
  const router = useRouter();
  return (
    <Tap
      onPress={() => router.push({ pathname: '/brand/[slug]', params: { slug: brand.slug } })}
      style={[styles.card, { width, backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.lg }]}
      pressScale={0.98}
      accessibilityLabel={`متجر ${brand.name}`}
    >
      <View style={[styles.cover, { height: width * 0.42, backgroundColor: t.c.accentSoft }]}>
        {brand.coverUrl && <Image source={brand.coverUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />}
      </View>
      <View style={styles.body}>
        <View style={styles.logo}>
          <BrandLogo uri={brand.logoUrl} size={52} name={brand.name} />
        </View>
        <View style={styles.row}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flexShrink}>
            {brand.name}
          </Text>
          <BadgeCheck size={16} color={t.c.brand} />
        </View>
        <StoreTypeBadge type={brand.storeType} />
        <Text variant="meta" color="ink2" numberOfLines={2} style={styles.desc}>
          {brand.description || 'متجر مصري على دكاكين'}
        </Text>
        <View style={styles.row}>
          <Rating value={brand.ratingAvg} count={brand.ratingCount} size={12} />
          {brand.shipping.freeShippingThreshold != null && (
            <Text variant="meta" color="success">
              شحن مجاني متاح
            </Text>
          )}
        </View>
      </View>
    </Tap>
  );
});

/** Compact circle + name, for horizontal "brands" rails. */
export const BrandBubble = memo(function BrandBubble({ brand }: { brand: PublicBrand }) {
  const router = useRouter();
  return (
    <Tap onPress={() => router.push({ pathname: '/brand/[slug]', params: { slug: brand.slug } })} style={styles.bubble} accessibilityLabel={`متجر ${brand.name}`}>
      <BrandLogo uri={brand.logoUrl} size={68} name={brand.name} />
      <Text variant="meta" numberOfLines={1} align="center">
        {brand.name}
      </Text>
    </Tap>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  cover: { width: '100%' },
  body: { paddingHorizontal: 14, paddingBottom: 14, gap: 4 },
  logo: { marginTop: -28, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'space-between' },
  flexShrink: { flexShrink: 1 },
  desc: { minHeight: 36 },
  bubble: { width: 80, alignItems: 'center', gap: 6 },
});
