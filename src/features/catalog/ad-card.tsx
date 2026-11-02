import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, ImageOff, Megaphone } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import type { ProductCard as Product } from '@/api/types';
import { useTheme } from '@/theme';
import { Badge, Icon, PriceTag, Rating, Tap, Text } from '@/ui';
import { WishlistHeart } from './product-card';

export const AD_ASPECT = 0.56; // card height / width

/** Paid placement: a wide banner-style card, so ads never pass for a regular product card. */
export const AdCard = memo(function AdCard({ product, width }: { product: Product; width: number }) {
  const t = useTheme();
  const router = useRouter();
  const height = Math.round(width * AD_ASPECT);
  return (
    <Tap
      onPress={() => {
        if (product.adId) api.post(`/ads/${product.adId}/click`).catch(() => undefined);
        router.push({ pathname: '/product/[id]', params: { id: product.id } });
      }}
      pressScale={0.99}
      style={{ width, height }}
      accessibilityLabel={`إعلان، ${product.title}، ${product.brand.name ?? ''}`}
    >
      <LinearGradient
        colors={t.dark ? [t.c.sunken, t.c.surface] : ['#FFE3CF', '#FFF6EE']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.card, { borderRadius: t.radius.xl, borderColor: t.c.lineStrong }]}
      >
        <View style={[styles.imageWrap, { backgroundColor: t.c.surface, borderRadius: t.radius.lg }]}>
          {!product.imageUrl && (
            <View style={styles.noImage} pointerEvents="none">
              <ImageOff size={28} color={t.c.lineStrong} />
            </View>
          )}
          <Image
            source={product.imageUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            recyclingKey={product.id}
            accessibilityIgnoresInvertColors
          />
          {product.sale && (
            <View style={styles.sale}>
              <Badge label={`-${product.sale.percent}%`} tone="danger" />
            </View>
          )}
          {!product.inStock && (
            <View style={[styles.soldOut, { backgroundColor: t.c.overlay }]}>
              <Text variant="meta" weight="bold" style={styles.onColor}>
                نفدت الكمية
              </Text>
            </View>
          )}
        </View>

        <View style={styles.copy}>
          <View style={styles.headRow}>
            <View style={[styles.adTag, { backgroundColor: t.c.accent }]}>
              <Icon as={Megaphone} size={12} color="onAccent" />
              <Text variant="meta" weight="bold" color="onAccent" style={styles.tagText}>
                إعلان
              </Text>
            </View>
            <WishlistHeart productId={product.id} size={32} />
          </View>
          {!!product.brand.name && (
            <Text variant="meta" weight="semibold" color="accent" numberOfLines={1}>
              {product.brand.name}
            </Text>
          )}
          <Text variant="ui" weight="bold" numberOfLines={2}>
            {product.title}
          </Text>
          <Rating value={product.ratingAvg} count={product.ratingCount} size={12} />
          <View style={styles.footer}>
            <PriceTag price={product.price} compareAt={product.compareAtPrice} size="sm" />
            <View style={[styles.cta, { backgroundColor: t.c.ink }]}>
              <Text variant="meta" weight="bold" style={{ color: t.c.ground }}>
                تسوّق
              </Text>
              <ArrowLeft size={14} color={t.c.ground} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </Tap>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1, flexDirection: 'row', gap: 12, padding: 10, borderWidth: 1, overflow: 'hidden' },
  imageWrap: { width: '42%', overflow: 'hidden' },
  noImage: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  sale: { position: 'absolute', top: 8, start: 8 },
  soldOut: { position: 'absolute', bottom: 0, start: 0, end: 0, paddingVertical: 4, alignItems: 'center' },
  onColor: { color: '#fff' },
  copy: { flex: 1, gap: 2, paddingVertical: 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, minHeight: 22, borderRadius: 999 },
  tagText: { lineHeight: 18 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, minHeight: 30, borderRadius: 999 },
});
