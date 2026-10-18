import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ImageOff, ShoppingBag } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useCartMutations, useProduct } from '@/api/queries';
import type { ProductCard } from '@/api/types';
import { useRequireAuth } from '@/auth/use-auth';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Button, PriceTag, QuantityStepper, Sheet, Skeleton, Text, toast } from '@/ui';
import { imagesForColor, useVariantSelection, VariantPicker } from './variant-picker';

/** Full-width "add to cart" at the bottom of a product card; size and colour are picked in a sheet. */
export function QuickAddButton({ product }: { product: ProductCard }) {
  const requireAuth = useRequireAuth();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        label={product.inStock ? 'أضف للسلة' : 'نفدت الكمية'}
        icon={ShoppingBag}
        size="sm"
        variant="soft"
        disabled={!product.inStock}
        onPress={() => requireAuth('سجّل عشان تضيف للسلة وتطلب.', () => setOpen(true))}
        style={styles.button}
      />
      {open && <QuickAddSheet product={product} onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickAddSheet({ product, onClose }: { product: ProductCard; onClose: () => void }) {
  const t = useTheme();
  const router = useRouter();
  const detail = useProduct(product.id);
  const cart = useCartMutations(product.brand.id);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [missing, setMissing] = useState(false);
  const sel = useVariantSelection(detail.data?.variants ?? [], size, color);
  const v = sel.selected;
  const max = Math.max(1, Math.min(v?.available ?? 20, 20));
  const thumb = detail.data ? (imagesForColor(detail.data.images, detail.data.imageColors, color)[0] ?? product.imageUrl) : product.imageUrl;

  const add = () => {
    if (!v) {
      setMissing(true);
      haptic.warning();
      return;
    }
    cart.add.mutate(
      { productId: product.id, variantId: v.id, quantity: Math.min(qty, max) },
      {
        onSuccess: () => {
          haptic.success();
          onClose();
          toast.success('اتضاف للسلة', { label: 'عرض السلة', onPress: () => router.push('/cart') });
        },
        onError: (e) => {
          haptic.error();
          toast.error(errorMessage(e));
        },
      },
    );
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="أضف للسلة"
      footer={<Button label="أضف للسلة" icon={ShoppingBag} loading={cart.add.isPending} disabled={!!v && !v.inStock} onPress={add} />}
    >
      <View style={styles.head}>
        <View style={[styles.thumb, { backgroundColor: t.c.sunken, borderRadius: t.radius.md }]}>
          {thumb ? <Image source={thumb} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : <ImageOff size={22} color={t.c.lineStrong} />}
        </View>
        <View style={styles.flex}>
          <Text variant="ui" weight="semibold" numberOfLines={2}>
            {product.title}
          </Text>
          <PriceTag price={v?.price ?? product.price} compareAt={product.compareAtPrice} size="sm" />
        </View>
      </View>
      {detail.isLoading ? (
        <>
          <Skeleton height={44} />
          <Skeleton height={44} />
        </>
      ) : detail.error ? (
        <Text variant="ui" color="danger">
          {errorMessage(detail.error)}
        </Text>
      ) : (
        <VariantPicker
          sizes={sel.sizes}
          colors={sel.colors}
          size={size}
          color={color}
          onSize={(s) => {
            haptic.tap();
            setSize(s);
            setMissing(false);
          }}
          onColor={(c) => {
            haptic.tap();
            setColor(c);
            setMissing(false);
          }}
          sizeAvailable={sel.sizeAvailable}
          colorAvailable={sel.colorAvailable}
          missing={missing}
        />
      )}
      <View style={styles.qty}>
        <Text variant="ui" color="ink2">
          الكمية
        </Text>
        <QuantityStepper value={Math.min(qty, max)} onChange={setQty} max={max} compact />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  button: { marginTop: 'auto' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 64, height: 76, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  qty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
