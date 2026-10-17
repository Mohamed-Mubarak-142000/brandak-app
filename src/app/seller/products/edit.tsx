import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, CircleAlert, ImagePlus, Plus, Star, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { api, ApiError, errorMessage } from '@/api/client';
import { qk, useCategories, useSellerProduct } from '@/api/queries';
import type { BrandProduct } from '@/api/types';
import { pickImages, uploadFile } from '@/api/upload';
import { haptic } from '@/lib/haptics';
import { latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Card, Chip, ErrorState, IconButton, Screen, Skeleton, Tap, Text, TextField, toast } from '@/ui';

interface Img {
  fileId?: string;
  url: string;
  uploading?: boolean;
}
interface VariantDraft {
  key: string;
  id?: string;
  size: string;
  color: string;
  sku: string;
  price: string;
  stock: string;
}

const num = (s: string) => {
  const n = Number(latinDigits(s).trim());
  return s.trim() !== '' && Number.isFinite(n) ? n : undefined;
};
const newVariant = (): VariantDraft => ({ key: Math.random().toString(36).slice(2), size: '', color: '', sku: '', price: '', stock: '' });

export default function ProductEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useSellerProduct(id);
  if (id && !existing.data)
    return (
      <Screen header={<AppBar title='تعديل المنتج' />}>
        {existing.error ? (
          <ErrorState error={existing.error} onRetry={() => existing.refetch()} />
        ) : (
          <>
            <Skeleton height={120} />
            <Skeleton height={300} />
          </>
        )}
      </Screen>
    );
  return <ProductForm key={id ?? 'new'} id={id} product={existing.data} />;
}

function ProductForm({ id, product: p }: { id?: string; product?: BrandProduct }) {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const categories = useCategories();

  const [images, setImages] = useState<Img[]>(() => p?.images.map((i) => ({ fileId: i.fileId, url: i.url })) ?? []);
  const [title, setTitle] = useState(p?.title ?? '');
  const [description, setDescription] = useState(p?.description ?? '');
  const [categoryId, setCategoryId] = useState(p?.categoryId ?? '');
  const [price, setPrice] = useState(p ? String(p.price) : '');
  const [compareAt, setCompareAt] = useState(p?.compareAtPrice != null ? String(p.compareAtPrice) : '');
  const [variants, setVariants] = useState<VariantDraft[]>(() =>
    p
      ? p.variants.map((v) => ({ key: v._id, id: v._id, size: v.size ?? '', color: v.color ?? '', sku: v.sku ?? '', price: v.price != null ? String(v.price) : '', stock: String(v.stock) }))
      : [newVariant()],
  );
  const [tags, setTags] = useState(p?.tags.join('، ') ?? '');
  const [publish, setPublish] = useState(p ? p.status === 'ACTIVE' : true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addImages = async () => {
    const files = await pickImages({ multiple: true, limit: 10 - images.length });
    for (const f of files) {
      setImages((xs) => [...xs, { url: f.uri, uploading: true }]);
      uploadFile(f, 'PRODUCT_IMAGE')
        .then((res) => setImages((xs) => xs.map((x) => (x.url === f.uri ? { fileId: res.id, url: res.url ?? f.uri } : x))))
        .catch((e) => {
          toast.error(errorMessage(e));
          setImages((xs) => xs.filter((x) => x.url !== f.uri));
        });
    }
  };

  const makeCover = (i: number) => setImages((xs) => [xs[i], ...xs.filter((_, j) => j !== i)]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (title.trim().length < 2) e.title = 'اسم المنتج حرفين على الأقل';
    if (!categoryId) e.category = 'اختار القسم';
    const p = num(price);
    if (!p || p < 1) e.price = 'السعر لازم يكون 1 جنيه أو أكتر';
    const c = num(compareAt);
    if (c != null && p != null && c <= p) e.compareAt = 'لازم يكون أكبر من السعر';
    if (variants.some((v) => num(v.stock) == null || num(v.stock)! < 0)) e.variants = 'اكتب المخزون لكل اختيار';
    if (images.some((i) => i.uploading)) e.images = 'استنى الصور تخلص رفع';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const body = () => ({
    title: title.trim(),
    description: description.trim() || undefined,
    categoryId,
    price: num(price),
    compareAtPrice: num(compareAt) ?? null,
    imageFileIds: images.filter((i) => i.fileId).map((i) => i.fileId!),
    variants: variants.map((v) => ({
      id: v.id,
      size: v.size.trim() || undefined,
      color: v.color.trim() || undefined,
      sku: v.sku.trim() || undefined,
      price: num(v.price) ?? null,
      stock: Math.round(num(v.stock) ?? 0),
    })),
    tags: tags
      .split(/[,،]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 20),
    status: publish ? 'ACTIVE' : 'DRAFT',
  });

  const save = useMutation({
    mutationFn: () => (id ? api.patch<BrandProduct>(`/brand/products/${id}`, body()) : api.post<BrandProduct>('/brand/products', body())),
    onSuccess: (p) => {
      haptic.success();
      qc.setQueryData(qk.sellerProduct(p._id), p);
      qc.invalidateQueries({ queryKey: ['seller', 'products'] });
      qc.invalidateQueries({ queryKey: ['seller', 'overview'] });
      toast.success(p.status === 'ACTIVE' ? 'المنتج اتنشر' : 'اتحفظ كمسودة');
      router.back();
    },
    onError: () => haptic.error(),
  });

  const archive = useMutation({
    mutationFn: () => api.del(`/brand/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller', 'products'] });
      toast.info('المنتج اتأرشف');
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const saveErr = save.error instanceof ApiError ? save.error : null;

  return (
    <Screen
      keyboard
      header={
        <AppBar
          title={id ? 'تعديل المنتج' : 'منتج جديد'}
          end={
            id ? (
              <IconButton
                icon={Archive}
                label="أرشفة المنتج"
                color="danger"
                onPress={() =>
                  Alert.alert('أرشفة المنتج؟', 'هيختفي من المتجر. تقدر ترجّعه من فلتر "مؤرشف".', [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'أرشفة', style: 'destructive', onPress: () => archive.mutate() },
                  ])
                }
              />
            ) : undefined
          }
        />
      }
      footer={<Button label={publish ? 'حفظ ونشر' : 'حفظ كمسودة'} loading={save.isPending} onPress={() => validate() && save.mutate()} />}
    >
      {saveErr && (
        <Banner
          icon={CircleAlert}
          tone="danger"
          title={saveErr.message}
          body={saveErr.code === 'SUBSCRIPTION_REQUIRED' || saveErr.code === 'PRODUCT_LIMIT' ? 'احفظه كمسودة دلوقتي، أو حدّث باقتك.' : undefined}
          action={saveErr.code === 'SUBSCRIPTION_REQUIRED' || saveErr.code === 'PRODUCT_LIMIT' ? 'الباقات' : undefined}
          onAction={() => router.push('/seller/plans')}
        />
      )}

      {/* Images */}
      <View style={styles.gap}>
        <Text variant="bodyStrong">الصور ({images.length}/10)</Text>
        <Text variant="meta" color={errors.images ? 'danger' : 'ink3'}>
          {errors.images ?? 'الصورة الأولى هي الغلاف. دوس على النجمة عشان تخلي صورة غلاف.'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imgs}>
          {images.map((img, i) => (
            <View key={img.url} style={[styles.img, { backgroundColor: t.c.sunken, borderColor: i === 0 ? t.c.brand : t.c.line }]}>
              <Image source={img.url} style={StyleSheet.absoluteFill} contentFit="cover" />
              {img.uploading && (
                <View style={[styles.imgOverlay, { backgroundColor: t.c.overlay }]}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
              <View style={styles.imgActions}>
                {i > 0 ? <IconButton icon={Star} label="اجعلها الغلاف" size={30} background="surface" onPress={() => makeCover(i)} /> : <View />}
                <IconButton icon={X} label="حذف الصورة" size={30} background="surface" onPress={() => setImages((xs) => xs.filter((_, j) => j !== i))} />
              </View>
              {i === 0 && (
                <View style={[styles.coverTag, { backgroundColor: t.c.brand }]}>
                  <Text variant="meta" style={{ color: '#fff' }}>
                    الغلاف
                  </Text>
                </View>
              )}
            </View>
          ))}
          {images.length < 10 && (
            <Tap onPress={addImages} style={[styles.img, styles.addImg, { borderColor: t.c.lineStrong, backgroundColor: t.c.surface }]} accessibilityLabel="إضافة صور">
              <ImagePlus size={28} color={t.c.ink3} />
              <Text variant="meta" color="ink3">
                إضافة صور
              </Text>
            </Tap>
          )}
        </ScrollView>
      </View>

      <TextField label="اسم المنتج" placeholder="مثال: تيشيرت قطن أوفرسايز" value={title} onChangeText={setTitle} maxLength={120} error={errors.title} />
      <TextField label="الوصف" optional multiline value={description} onChangeText={setDescription} maxLength={5000} placeholder="الخامة، المقاسات، طريقة الغسيل..." />

      <View style={styles.gap}>
        <Text variant="ui" color={errors.category ? 'danger' : 'ink2'}>
          {errors.category ?? 'القسم'}
        </Text>
        <View style={styles.wrap}>
          {(categories.data ?? [])
            .filter((c) => c.isActive)
            .map((c) => (
              <Chip key={c._id} label={c.nameAr} selected={categoryId === c._id} onPress={() => setCategoryId(c._id)} />
            ))}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label="السعر (ج.م)" placeholder="مثال: 350" value={price} onChangeText={setPrice} keyboardType="decimal-pad" ltr error={errors.price} />
        </View>
        <View style={styles.flex}>
          <TextField label="السعر قبل الخصم" placeholder="مثال: 450" optional value={compareAt} onChangeText={setCompareAt} keyboardType="decimal-pad" ltr error={errors.compareAt} />
        </View>
      </View>

      {/* Variants */}
      <View style={styles.gap}>
        <Text variant="bodyStrong">المقاسات والألوان والمخزون</Text>
        <Text variant="meta" color={errors.variants ? 'danger' : 'ink3'}>
          {errors.variants ?? 'كل سطر = اختيار للعميل. سيب المقاس/اللون فاضي لو المنتج مقاس واحد.'}
        </Text>
        {variants.map((v, i) => (
          <Card key={v.key} style={styles.gapSm}>
            <View style={styles.between}>
              <Text variant="ui" weight="semibold">
                اختيار {i + 1}
              </Text>
              {variants.length > 1 && <IconButton icon={Trash2} label="حذف الاختيار" size={36} color="danger" onPress={() => setVariants((xs) => xs.filter((x) => x.key !== v.key))} />}
            </View>
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField label="المقاس" optional value={v.size} onChangeText={(s) => setVariants((xs) => xs.map((x) => (x.key === v.key ? { ...x, size: s } : x)))} placeholder="M" maxLength={30} />
              </View>
              <View style={styles.flex}>
                <TextField label="اللون" optional value={v.color} onChangeText={(s) => setVariants((xs) => xs.map((x) => (x.key === v.key ? { ...x, color: s } : x)))} placeholder="أسود" maxLength={30} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField label="المخزون" placeholder="مثال: 10" value={v.stock} onChangeText={(s) => setVariants((xs) => xs.map((x) => (x.key === v.key ? { ...x, stock: s } : x)))} keyboardType="number-pad" ltr />
              </View>
              <View style={styles.flex}>
                <TextField label="سعر مختلف" placeholder="نفس سعر المنتج" optional value={v.price} onChangeText={(s) => setVariants((xs) => xs.map((x) => (x.key === v.key ? { ...x, price: s } : x)))} keyboardType="decimal-pad" ltr />
              </View>
            </View>
            <TextField label="SKU" placeholder="مثال: TS-BLK-M" optional value={v.sku} onChangeText={(s) => setVariants((xs) => xs.map((x) => (x.key === v.key ? { ...x, sku: s } : x)))} autoCapitalize="characters" ltr maxLength={60} />
          </Card>
        ))}
        {variants.length < 100 && <Button label="إضافة اختيار" icon={Plus} variant="soft" onPress={() => setVariants((xs) => [...xs, newVariant()])} />}
      </View>

      <TextField label="كلمات مفتاحية" optional value={tags} onChangeText={setTags} placeholder="صيفي، قطن، أوفرسايز" hint="افصل بينها بفاصلة — بتساعد في البحث" />

      <View style={[styles.publish, { borderColor: t.c.line, backgroundColor: t.c.surface, borderRadius: t.radius.md }]}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">نشر في المتجر</Text>
          <Text variant="meta" color="ink3">
            {publish ? 'هيظهر للعملاء فوراً' : 'هيتحفظ كمسودة محدش يشوفها'}
          </Text>
        </View>
        <Switch value={publish} onValueChange={setPublish} trackColor={{ true: t.c.accent, false: t.c.lineStrong }} thumbColor="#fff" accessibilityLabel="نشر في المتجر" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  gapSm: { gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  imgs: { gap: 10 },
  img: { width: 110, height: 136, borderRadius: 12, overflow: 'hidden', borderWidth: 2 },
  addImg: { alignItems: 'center', justifyContent: 'center', gap: 6, borderStyle: 'dashed', borderWidth: 1.5 },
  imgOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  imgActions: { flexDirection: 'row', justifyContent: 'space-between', padding: 4 },
  coverTag: { position: 'absolute', bottom: 0, start: 0, end: 0, alignItems: 'center', paddingVertical: 2 },
  publish: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
});
