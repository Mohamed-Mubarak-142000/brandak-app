import { FlashList } from '@shopify/flash-list';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Minus, Plus, Search } from 'lucide-react-native';
import { memo, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api/client';
import { flatPages, useSellerProducts } from '@/api/queries';
import type { BrandProduct, ProductStatus } from '@/api/types';
import { DeskHeader } from '@/features/seller/desk-header';
import { formatMoney } from '@/lib/format';
import { useTheme } from '@/theme';
import { Badge, Button, Chip, EmptyState, ErrorState, IconButton, Sheet, Skeleton, Tap, Text, TextField, toast } from '@/ui';

const STATUS: { key?: ProductStatus; label: string }[] = [
  { label: 'الكل' },
  { key: 'ACTIVE', label: 'منشور' },
  { key: 'DRAFT', label: 'مسودة' },
  { key: 'ARCHIVED', label: 'مؤرشف' },
];
const STATUS_TONE = { ACTIVE: 'success', DRAFT: 'neutral', ARCHIVED: 'warning' } as const;
const STATUS_AR = { ACTIVE: 'منشور', DRAFT: 'مسودة', ARCHIVED: 'مؤرشف' } as const;

export default function SellerProducts() {
  const t = useTheme();
  const router = useRouter();
  const [status, setStatus] = useState<ProductStatus | undefined>();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [stockFor, setStockFor] = useState<BrandProduct | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);
  const products = useSellerProducts({ status, q: q || undefined });
  const items = flatPages(products.data);

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground }]}>
      <DeskHeader title="المنتجات" end={<IconButton icon={Plus} label="منتج جديد" background="accent" color="onAccent" onPress={() => router.push('/seller/products/edit')} />} />
      <View style={styles.search}>
        <TextField label="بحث" icon={Search} value={text} onChangeText={setText} placeholder="اسم المنتج" returnKeyType="search" />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUS.map((s) => (
            <Chip key={s.label} label={s.label} selected={status === s.key} onPress={() => setStatus(s.key)} />
          ))}
        </ScrollView>
      </View>
      <FlashList
        data={items}
        keyExtractor={(p) => p._id}
        renderItem={({ item }) => (
          <ProductRow product={item} onPress={() => router.push({ pathname: '/seller/products/edit', params: { id: item._id } })} onStock={() => setStockFor(item)} />
        )}
        contentContainerStyle={styles.list}
        onEndReached={() => products.hasNextPage && !products.isFetchingNextPage && products.fetchNextPage()}
        refreshControl={<RefreshControl refreshing={products.isRefetching && !products.isFetchingNextPage} onRefresh={() => void products.refetch()} tintColor={t.c.brand} colors={[t.c.brand]} />}
        ListEmptyComponent={
          products.isLoading ? (
            <View style={styles.gap}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={92} radius={14} />
              ))}
            </View>
          ) : products.error ? (
            <ErrorState error={products.error} onRetry={() => products.refetch()} />
          ) : (
            <EmptyState art="box" title="ضيف أول منتج" body="صور حلوة + وصف واضح + مقاسات = مبيعات أكتر." action="إضافة منتج" onAction={() => router.push('/seller/products/edit')} />
          )
        }
      />
      <StockSheet key={stockFor?._id ?? 'none'} product={stockFor} onClose={() => setStockFor(null)} />
    </View>
  );
}

const ProductRow = memo(function ProductRow({ product: p, onPress, onStock }: { product: BrandProduct; onPress: () => void; onStock: () => void }) {
  const t = useTheme();
  return (
    <Tap onPress={onPress} pressScale={0.99} style={[styles.row, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.md }]} accessibilityLabel={p.title}>
      <Image source={p.images[0]?.url} style={[styles.thumb, { backgroundColor: t.c.sunken }]} contentFit="cover" />
      <View style={styles.flex}>
        <Text variant="ui" weight="semibold" numberOfLines={1}>
          {p.title}
        </Text>
        <Text variant="meta" color="ink2">
          {formatMoney(p.price)} · {p.soldCount} مبيع
        </Text>
        <View style={styles.inline}>
          <Badge label={STATUS_AR[p.status]} tone={STATUS_TONE[p.status]} />
          <Text variant="meta" color={p.totalStock <= 3 ? 'danger' : 'ink3'}>
            المخزون {p.totalStock}
          </Text>
        </View>
      </View>
      <Button label="المخزون" size="sm" variant="soft" block={false} onPress={onStock} />
    </Tap>
  );
});

/** Quick stock adjust per variant without opening the full editor. */
function StockSheet({ product, onClose }: { product: BrandProduct | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [local, setLocal] = useState<BrandProduct | null>(product);
  const adjust = useMutation({
    mutationFn: ({ variantId, delta }: { variantId: string; delta: number }) => api.post<BrandProduct>(`/brand/products/${product!._id}/variants/${variantId}/stock`, { delta }),
    onSuccess: (p) => {
      setLocal(p);
      qc.invalidateQueries({ queryKey: ['seller', 'products'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Sheet open={!!product} onClose={onClose} title="تعديل المخزون">
      {local?.variants.map((v) => (
        <View key={v._id} style={styles.stockRow}>
          <Text variant="ui" style={styles.flex}>
            {[v.size, v.color].filter(Boolean).join(' / ') || 'أساسي'}
            {v.sku ? ` · ${v.sku}` : ''}
          </Text>
          <IconButton icon={Minus} label="تقليل" background="sunken" size={40} onPress={() => v.stock > 0 && adjust.mutate({ variantId: v._id, delta: -1 })} />
          <Text variant="bodyStrong" style={styles.stockNum}>
            {v.stock}
          </Text>
          <IconButton icon={Plus} label="زيادة" background="sunken" size={40} onPress={() => adjust.mutate({ variantId: v._id, delta: 1 })} />
          <Button label="+10" size="sm" variant="secondary" block={false} onPress={() => adjust.mutate({ variantId: v._id, delta: 10 })} />
        </View>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { paddingHorizontal: 16, paddingBottom: 8 },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  gap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: 1, marginBottom: 10 },
  thumb: { width: 64, height: 76, borderRadius: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockNum: { minWidth: 36, textAlign: 'center' },
});
