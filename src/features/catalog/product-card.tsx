import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Heart, ImageOff } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { api } from '@/api/client';
import { useToggleWishlist, useWishlistIds } from '@/api/queries';
import type { ProductCard as Product } from '@/api/types';
import { useIsSeller, useRequireAuth } from '@/auth/use-auth';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Badge, PriceTag, Rating, Tap, Text } from '@/ui';
import { Countdown } from './countdown';
import { QuickAddButton } from './quick-add';

export const CARD_ASPECT = 1.25; // image height / width

/** Heart toggle with a springy pop; guests get the sign-in sheet. */
export function WishlistHeart({ productId, size = 36, floating = true }: { productId: string; size?: number; floating?: boolean }) {
  const t = useTheme();
  const ids = useWishlistIds();
  const toggle = useToggleWishlist();
  const requireAuth = useRequireAuth();
  const seller = useIsSeller();
  const on = !!ids.data?.includes(productId);
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (seller) return null;
  return (
    <Tap
      pressScale={1}
      hitSlop={8}
      accessibilityRole="togglebutton"
      accessibilityState={{ checked: on }}
      accessibilityLabel={on ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
      onPress={() =>
        requireAuth('سجّل عشان تحفظ المنتجات اللي عجبتك.', () => {
          scale.set(withSequence(withSpring(1.3, { damping: 6, stiffness: 400 }), withSpring(1)));
          haptic.light();
          toggle.mutate({ productId, on: !on });
        })
      }
      style={[
        styles.heart,
        { width: size, height: size, borderRadius: size / 2 },
        floating && { backgroundColor: t.dark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.92)' },
      ]}
    >
      <Animated.View style={style}>
        <Heart size={size * 0.52} color={on ? t.c.danger : t.c.ink} fill={on ? t.c.danger : 'none'} strokeWidth={2} />
      </Animated.View>
    </Tap>
  );
}

export const ProductCard = memo(function ProductCard({ product, width }: { product: Product; width: number }) {
  const t = useTheme();
  const router = useRouter();
  const off = product.compareAtPrice && product.compareAtPrice > product.price;
  return (
    <Tap
      onPress={() => {
        // Paid placements count clicks for the store's stats.
        if (product.adId) api.post(`/ads/${product.adId}/click`).catch(() => undefined);
        router.push({ pathname: '/product/[id]', params: { id: product.id } });
      }}
      style={[styles.card, { width }]}
      pressScale={0.98}
      accessibilityLabel={`${product.title}، ${product.brand.name ?? ''}`}
    >
      <View style={[styles.imageWrap, { width, height: width * CARD_ASPECT, backgroundColor: t.c.sunken, borderRadius: t.radius.lg }]}>
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
        <View style={styles.topRow}>
          {product.sale ? (
            <Badge label={`-${product.sale.percent}%`} tone="danger" />
          ) : off ? (
            <Badge label="خصم" tone="danger" />
          ) : product.wholesale?.tiers.length ? (
            <Badge label="جملة" tone="brand" />
          ) : (
            <View />
          )}
          <WishlistHeart productId={product.id} />
        </View>
        {!product.inStock && (
          <View style={[styles.soldOut, { backgroundColor: t.c.overlay }]}>
            <Text variant="ui" weight="bold" color="onAccent" style={{ color: '#fff' }}>
              نفدت الكمية
            </Text>
          </View>
        )}
      </View>
      <View style={styles.meta}>
        {(product.brand.name || product.sponsored) && (
          <Text variant="meta" color="ink3" numberOfLines={1}>
            {product.sponsored ? 'مُموَّل' : ''}
            {product.sponsored && product.brand.name ? ' · ' : ''}
            {product.brand.name}
          </Text>
        )}
        <Text variant="ui" numberOfLines={2} style={styles.title}>
          {product.title}
        </Text>
        <PriceTag price={product.price} compareAt={product.compareAtPrice} size="sm" />
        {product.sale && <Countdown endsAt={product.sale.endsAt} prefix="باقي" />}
        <Rating value={product.ratingAvg} count={product.ratingCount} size={12} />
      </View>
      <QuickAddButton product={product} />
    </Tap>
  );
});

const styles = StyleSheet.create({
  // Column that fills the grid row, so every card's button sits on the same line.
  card: { gap: 8, alignSelf: 'stretch' },
  imageWrap: { overflow: 'hidden' },
  noImage: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 8 },
  heart: { alignItems: 'center', justifyContent: 'center' },
  soldOut: { position: 'absolute', bottom: 0, start: 0, end: 0, paddingVertical: 6, alignItems: 'center' },
  meta: { gap: 2 },
  title: { minHeight: 42 },
});
