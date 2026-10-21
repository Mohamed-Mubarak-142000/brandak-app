import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, Check, CircleAlert, ImagePlus, Plus, Sparkles, Star, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { api, ApiError, errorMessage } from '@/api/client';
import { qk, useAiStatus, useCampaigns, useCategories, useMyBrand, useSellerProduct } from '@/api/queries';
import type { BrandProduct, ProductDraft } from '@/api/types';
import { pickImages, uploadFile } from '@/api/upload';
import { swatchFor } from '@/features/catalog/variant-picker';
import { haptic } from '@/lib/haptics';
import { latinDigits } from '@/lib/validation';
import { useTheme } from '@/theme';
import { AppBar, Banner, Button, Card, Chip, ErrorState, IconButton, Screen, Sheet, Skeleton, Tap, Text, TextField, toast } from '@/ui';

interface Img {
  fileId?: string;
  url: string;
  uploading?: boolean;
  /** The variant colour this photo shows; null = every colour. */
  color?: string | null;
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
interface TierDraft {
  key: string;
  qty: string;
  price: string;
}
const newTier = (): TierDraft => ({ key: Math.random().toString(36).slice(2), qty: '', price: '' });

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
  const brand = useMyBrand();
  const categories = useCategories(brand.data?.storeType);

  // The store already chose its categories; a product picks only from those (and their subcategories).
  const brandCats = brand.data?.categoryIds ?? [];
  const active = (categories.data ?? []).filter((c) => c.isActive);
  const ofBrand = active.filter((c) => brandCats.includes(c._id) || (!!c.parentId && brandCats.includes(c.parentId)));
  const options = ofBrand.length ? ofBrand : active;

  const [images, setImages] = useState<Img[]>(() => p?.images.map((i) => ({ fileId: i.fileId, url: i.url, color: i.color ?? null })) ?? []);
  const [title, setTitle] = useState(p?.title ?? '');
  const [description, setDescription] = useState(p?.description ?? '');
  const [pickedCategory, setCategoryId] = useState(p?.categoryId ?? '');
  // A store with one category doesn't pick it again for every product.
  const onlyOption = options.length === 1 ? options[0] : undefined;
  const categoryId = pickedCategory || onlyOption?._id || (brandCats.length === 1 ? brandCats[0] : '');
  const categoryName = categories.data?.find((c) => c._id === categoryId)?.nameAr;
  const [price, setPrice] = useState(p ? String(p.price) : '');
  const [compareAt, setCompareAt] = useState(p?.compareAtPrice != null ? String(p.compareAtPrice) : '');
  const [variants, setVariants] = useState<VariantDraft[]>(() =>
    p
      ? p.variants.map((v) => ({ key: v._id, id: v._id, size: v.size ?? '', color: v.color ?? '', sku: v.sku ?? '', price: v.price != null ? String(v.price) : '', stock: String(v.stock) }))
      : [newVariant()],
  );
  const [colorFor, setColorFor] = useState<number | null>(null);
  const colorOptions = [...new Set(variants.map((v) => v.color.trim()).filter(Boolean))];
  const maxImages = 10;
  const [tags, setTags] = useState(p?.tags.join('، ') ?? '');
  const [publish, setPublish] = useState(p ? p.status === 'ACTIVE' : true);
  // A running (or scheduled) sale: percent off every size, until a date or the end of a season.
  const [mountedAt] = useState(() => Date.now());
  const liveSale = p?.sale && new Date(p.sale.endsAt).getTime() > mountedAt ? p.sale : null;
  const [saleOn, setSaleOn] = useState(!!liveSale);
  const [salePct, setSalePct] = useState(liveSale ? String(liveSale.percent) : '');
  const [saleDays, setSaleDays] = useState(3);
  const [saleDaysTouched, setSaleDaysTouched] = useState(false);
  const [now] = useState(() => Date.now());
  const [seasonId, setSeasonId] = useState<string | null>(liveSale?.campaignId ?? null);
  const campaigns = useCampaigns();
  const seasons = (campaigns.data ?? []).filter((c) => new Date(c.endsAt).getTime() > mountedAt);
  const season = seasons.find((c) => c._id === seasonId);
  // Wholesale: a minimum per order and cheaper prices by quantity (warehouses, mostly).
  const [wsOn, setWsOn] = useState(!!p?.wholesale);
  const [wsMin, setWsMin] = useState(p?.wholesale ? String(p.wholesale.minQty) : '');
  const [tiers, setTiers] = useState<TierDraft[]>(() =>
    p?.wholesale?.tiers.length ? p.wholesale.tiers.map((x) => ({ key: String(x.minQty), qty: String(x.minQty), price: String(x.price) })) : [newTier()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const ai = useAiStatus(!id);

  /** Fills the form from the model's suggestion; the seller reviews before saving. */
  const applyDraft = (d: ProductDraft) => {
    if (d.title) setTitle(d.title);
    if (d.description) setDescription(d.description);
    if (d.categoryId) setCategoryId(d.categoryId);
    if (d.tags.length) setTags(d.tags.join('، '));
    const sizes = d.sizes.length ? d.sizes : [''];
    const colors = d.colors.length ? d.colors : [''];
    if (sizes.length * colors.length > 1 || sizes[0] || colors[0]) {
      setVariants(sizes.flatMap((size) => colors.map((color) => ({ ...newVariant(), size, color }))).slice(0, 30));
    }
  };
  const draft = useMutation({
    mutationFn: async () => {
      let fileId = images.find((i) => i.fileId)?.fileId;
      if (!fileId) {
        const [f] = await pickImages();
        if (!f) return null;
        setImages((xs) => [...xs, { url: f.uri, uploading: true }]);
        try {
          const res = await uploadFile(f, 'PRODUCT_IMAGE');
          setImages((xs) => xs.map((x) => (x.url === f.uri ? { fileId: res.id, url: res.url ?? f.uri } : x)));
          fileId = res.id;
        } catch (e) {
          setImages((xs) => xs.filter((x) => x.url !== f.uri));
          throw e;
        }
      }
      return api.post<ProductDraft>('/brand/ai/product-draft', { imageFileId: fileId });
    },
    onSuccess: (d) => {
      if (!d) return;
      haptic.success();
      applyDraft(d);
      qc.invalidateQueries({ queryKey: ['seller', 'ai'] });
      toast.success('البيانات جاهزة، راجعها واكتب السعر والمخزون');
    },
    onError: (e) => {
      haptic.error();
      toast.error(errorMessage(e));
    },
  });

  const addImages = async () => {
    const files = await pickImages({ multiple: true, limit: Math.max(1, maxImages - images.length) });
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
    // A published product with no photo shows an empty box everywhere in the app.
    if (publish && !images.length) e.images = 'ضيف صورة واحدة على الأقل عشان المنتج يتنشر، أو احفظه كمسودة';
    const p = num(price);
    if (!p || p < 1) e.price = 'السعر لازم يكون 1 جنيه أو أكتر';
    const c = num(compareAt);
    if (c != null && p != null && c <= p) e.compareAt = 'لازم يكون أكبر من السعر';
    if (saleOn) {
      const pct = num(salePct);
      if (!pct || pct < 1 || pct > 90) e.sale = 'نسبة الخصم من 1 لـ 90%';
      else if (season && pct < season.minPercent) e.sale = `الموسم ده محتاج خصم ${season.minPercent}% على الأقل`;
    }
    if (variants.some((v) => num(v.stock) == null || num(v.stock)! < 0)) e.variants = 'اكتب المخزون لكل اختيار';
    if (wsOn) {
      const filled = tiers.filter((x) => x.qty.trim() || x.price.trim());
      const sorted = filled.map((x) => ({ q: num(x.qty) ?? 0, pr: num(x.price) ?? 0 })).sort((a, b) => a.q - b.q);
      if (num(wsMin) == null || num(wsMin)! < 1) e.wholesale = 'اكتب أقل كمية للطلب';
      else if (sorted.some((x) => x.q < 2 || x.pr < 1)) e.wholesale = 'كل سعر جملة محتاج كمية (2 أو أكتر) وسعر';
      else if (sorted.some((x, i) => x.pr >= (num(price) ?? 0) || (i > 0 && (x.q === sorted[i - 1].q || x.pr >= sorted[i - 1].pr)))) {
        e.wholesale = 'كل ما الكمية تزيد السعر يقل، وكله أقل من السعر العادي';
      }
    }
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
    sale: saleOn
      ? {
          percent: Math.round(num(salePct) ?? 0),
          // A season sale runs for the whole season; otherwise from now for the chosen days.
          startsAt: season ? new Date(Math.max(now, new Date(season.startsAt).getTime())).toISOString() : undefined,
          endsAt: season ? season.endsAt : liveSale && !saleDaysTouched ? liveSale.endsAt : new Date(now + saleDays * 86_400_000).toISOString(),
          campaignId: season?._id,
        }
      : null,
    wholesale: wsOn
      ? {
          minQty: Math.round(num(wsMin) ?? 1),
          tiers: tiers.filter((x) => num(x.qty) && num(x.price)).map((x) => ({ minQty: Math.round(num(x.qty)!), price: num(x.price)! })),
        }
      : null,
    imageFileIds: images.filter((i) => i.fileId).map((i) => i.fileId!),
    // A colour that was renamed or removed from the variants falls back to "every colour".
    imageColors: images.filter((i) => i.fileId).map((i) => (i.color && colorOptions.includes(i.color) ? i.color : '')),
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
      .map((x) => x.trim().slice(0, 30))
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
        />
      )}

      {!id && ai.data?.enabled && (
        <Card style={styles.gap}>
          <View style={styles.between}>
            <View style={styles.flex}>
              <Text variant="bodyStrong">اعمل المنتج من صورة</Text>
              <Text variant="meta" color="ink3">
                ارفع صورة والذكاء الاصطناعي يكتبلك الاسم والوصف والقسم والمقاسات. باقي النهارده {ai.data.remaining}.
              </Text>
            </View>
          </View>
          <Button label={images.length ? 'املا البيانات من أول صورة' : 'اختار صورة'} icon={Sparkles} variant="soft" loading={draft.isPending} disabled={!ai.data.remaining || images.some((i) => i.uploading)} onPress={() => draft.mutate()} />
        </Card>
      )}

      {/* Images */}
      <View style={styles.gap}>
        <Text variant="bodyStrong">
          الصور ({images.length}/{maxImages})
        </Text>
        <Text variant="meta" color={errors.images ? 'danger' : 'ink3'}>
          {errors.images ??
            (colorOptions.length > 1
              ? 'الصورة الأولى هي الغلاف. حدد لون كل صورة عشان العميل لما يختار لون يشوف صوره هو بس.'
              : 'الصورة الأولى هي الغلاف. دوس على النجمة عشان تخلي صورة غلاف.')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imgs}>
          {images.map((img, i) => (
            <View key={img.url} style={styles.imgCol}>
            <View style={[styles.img, { backgroundColor: t.c.sunken, borderColor: i === 0 ? t.c.brand : t.c.line }]}>
              <Image source={img.url} style={StyleSheet.absoluteFill} contentFit="cover" />
              {img.uploading && (
                <View style={[styles.imgOverlay, { backgroundColor: t.c.overlay }]}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
              <View style={styles.imgActions}>
                {i > 0 ? <IconButton icon={Star} label="اجعلها الغلاف" size={36} background="surface" onPress={() => makeCover(i)} /> : <View />}
                <IconButton icon={X} label="حذف الصورة" size={36} background="surface" onPress={() => setImages((xs) => xs.filter((_, j) => j !== i))} />
              </View>
              {i === 0 && (
                <View style={[styles.coverTag, { backgroundColor: t.c.brand }]}>
                  <Text variant="meta" style={{ color: '#fff' }}>
                    الغلاف
                  </Text>
                </View>
              )}
            </View>
            {colorOptions.length > 0 && (
              <Tap
                onPress={() => setColorFor(i)}
                pressScale={0.97}
                accessibilityLabel={`لون الصورة ${i + 1}: ${img.color ?? 'كل الألوان'}`}
                style={[styles.colorPill, { borderColor: img.color ? t.c.brand : t.c.line, backgroundColor: img.color ? t.c.accentSoft : t.c.surface }]}
              >
                {img.color && swatchFor(img.color) ? <View style={[styles.colorDot, { backgroundColor: swatchFor(img.color), borderColor: t.c.lineStrong }]} /> : null}
                <Text variant="meta" color={img.color ? 'accent' : 'ink3'} numberOfLines={1}>
                  {img.color ?? 'كل الألوان'}
                </Text>
              </Tap>
            )}
            </View>
          ))}
          {images.length < maxImages && (
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

      {onlyOption && (!pickedCategory || pickedCategory === onlyOption._id) ? (
        <View style={[styles.fixedCat, { backgroundColor: t.c.sunken, borderRadius: t.radius.md }]}>
          <Text variant="ui" color="ink2">
            القسم: <Text variant="ui" weight="bold">{categoryName ?? onlyOption.nameAr}</Text>
          </Text>
          <Text variant="meta" color="ink3">
            من إعدادات المتجر
          </Text>
        </View>
      ) : (
        <View style={styles.gap}>
          <Text variant="ui" color={errors.category ? 'danger' : 'ink2'}>
            {errors.category ?? 'القسم'}
          </Text>
          {categories.isLoading || brand.isLoading ? (
            <Skeleton height={40} />
          ) : (
            <View style={styles.wrap}>
              {options.map((c) => (
                <Chip key={c._id} label={c.nameAr} selected={categoryId === c._id} onPress={() => setCategoryId(c._id)} />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label="السعر (ج.م)" placeholder="مثال: 350" value={price} onChangeText={setPrice} keyboardType="decimal-pad" ltr error={errors.price} />
        </View>
        <View style={styles.flex}>
          <TextField label="السعر قبل الخصم" placeholder="مثال: 450" optional value={compareAt} onChangeText={setCompareAt} keyboardType="decimal-pad" ltr error={errors.compareAt} />
        </View>
      </View>

      {/* Limited-time sale */}
      <View style={[styles.publish, { borderColor: saleOn ? t.c.brand : t.c.line, backgroundColor: t.c.surface, borderRadius: t.radius.md }]}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">عرض لفترة محدودة</Text>
          <Text variant="meta" color="ink3">
            خصم على كل المقاسات، وعدّاد تنازلي يظهر للعملاء
          </Text>
        </View>
        <Switch value={saleOn} onValueChange={setSaleOn} trackColor={{ true: t.c.accent, false: t.c.lineStrong }} thumbColor="#fff" accessibilityLabel="عرض لفترة محدودة" />
      </View>
      {saleOn && (
        <Card style={styles.gap}>
          <TextField label="نسبة الخصم (%)" placeholder="20" value={salePct} onChangeText={setSalePct} keyboardType="number-pad" ltr error={errors.sale} />
          {num(price) && num(salePct) ? (
            <Text variant="meta" color="success">
              السعر هيبقى {Math.round((num(price)! * (100 - num(salePct)!)) / 100)} ج.م بدل {num(price)} ج.م
            </Text>
          ) : null}
          {seasons.length > 0 && (
            <>
              <Text variant="ui" color="ink2">
                شارك في موسم
              </Text>
              <View style={styles.wrap}>
                <Chip label="من غير موسم" selected={!seasonId} onPress={() => setSeasonId(null)} />
                {seasons.map((c) => (
                  <Chip key={c._id} label={`${c.nameAr} (${c.minPercent}%+)`} selected={seasonId === c._id} onPress={() => setSeasonId(c._id)} />
                ))}
              </View>
            </>
          )}
          {!season && (
            <>
              <Text variant="ui" color="ink2">
                مدة العرض
              </Text>
              <View style={styles.wrap}>
                {[1, 3, 7, 14].map((d) => (
                  <Chip
                    key={d}
                    label={d === 1 ? 'يوم واحد' : `${d} أيام`}
                    selected={saleDays === d && (saleDaysTouched || !liveSale)}
                    onPress={() => {
                      setSaleDaysTouched(true);
                      setSaleDays(d);
                    }}
                  />
                ))}
              </View>
              {liveSale && !saleDaysTouched && (
                <Text variant="meta" color="ink3">
                  العرض الحالي شغال لحد {new Date(liveSale.endsAt).toLocaleDateString('ar-EG')}
                </Text>
              )}
            </>
          )}
          {season && (
            <Text variant="meta" color="ink3">
              العرض هيشتغل طول مدة {season.nameAr}، ويظهر في صفحة الموسم.
            </Text>
          )}
        </Card>
      )}

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

      {/* Wholesale */}
      <View style={[styles.publish, { borderColor: wsOn ? t.c.brand : t.c.line, backgroundColor: t.c.surface, borderRadius: t.radius.md }]}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">أسعار الجملة</Text>
          <Text variant="meta" color="ink3">
            أقل كمية للطلب، وسعر أقل كل ما الكمية تزيد (كل المقاسات بتتحسب مع بعض)
          </Text>
        </View>
        <Switch value={wsOn} onValueChange={setWsOn} trackColor={{ true: t.c.accent, false: t.c.lineStrong }} thumbColor="#fff" accessibilityLabel="أسعار الجملة" />
      </View>
      {wsOn && (
        <Card style={styles.gap}>
          <TextField label="أقل كمية للطلب" placeholder="مثال: 6" value={wsMin} onChangeText={setWsMin} keyboardType="number-pad" ltr hint="اكتب 1 لو مفيش حد أدنى" />
          {tiers.map((x, i) => (
            <View key={x.key} style={[styles.row, styles.center]}>
              <View style={styles.flex}>
                <TextField label={i === 0 ? 'من كمية' : ' '} placeholder="12" value={x.qty} onChangeText={(s) => setTiers((xs) => xs.map((y) => (y.key === x.key ? { ...y, qty: s } : y)))} keyboardType="number-pad" ltr />
              </View>
              <View style={styles.flex}>
                <TextField label={i === 0 ? 'سعر القطعة' : ' '} placeholder="80" value={x.price} onChangeText={(s) => setTiers((xs) => xs.map((y) => (y.key === x.key ? { ...y, price: s } : y)))} keyboardType="decimal-pad" ltr />
              </View>
              {tiers.length > 1 && <IconButton icon={Trash2} label="حذف السعر" size={36} color="danger" onPress={() => setTiers((xs) => xs.filter((y) => y.key !== x.key))} />}
            </View>
          ))}
          {tiers.length < 3 && <Button label="سعر لكمية أكبر" icon={Plus} variant="soft" size="md" onPress={() => setTiers((xs) => [...xs, newTier()])} />}
          {errors.wholesale && (
            <Text variant="meta" color="danger">
              {errors.wholesale}
            </Text>
          )}
        </Card>
      )}

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
      <Sheet open={colorFor !== null} onClose={() => setColorFor(null)} title="الصورة دي بتاعة أنهي لون؟">
        {[null, ...colorOptions].map((c) => {
          const on = colorFor !== null && (images[colorFor]?.color ?? null) === c;
          return (
            <Tap
              key={c ?? 'all'}
              onPress={() => {
                setImages((xs) => xs.map((x, j) => (j === colorFor ? { ...x, color: c } : x)));
                setColorFor(null);
              }}
              pressScale={1}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[styles.colorRow, { borderBottomColor: t.c.line }]}
            >
              {c && swatchFor(c) ? <View style={[styles.colorDotLg, { backgroundColor: swatchFor(c), borderColor: t.c.lineStrong }]} /> : null}
              <Text variant="body" weight={on ? 'semibold' : 'regular'} color={on ? 'accent' : 'ink'} style={styles.flex}>
                {c ?? 'كل الألوان'}
              </Text>
              {on && <Check size={20} color={t.c.accent} />}
            </Tap>
          );
        })}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  gapSm: { gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  center: { alignItems: 'flex-end' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  imgs: { gap: 10 },
  img: { width: 110, height: 136, borderRadius: 12, overflow: 'hidden', borderWidth: 2 },
  imgCol: { gap: 6, width: 110 },
  colorPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 30, borderRadius: 15, borderWidth: 1, paddingHorizontal: 8 },
  colorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  colorDotLg: { width: 22, height: 22, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  addImg: { alignItems: 'center', justifyContent: 'center', gap: 6, borderStyle: 'dashed', borderWidth: 1.5 },
  imgOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  imgActions: { flexDirection: 'row', justifyContent: 'space-between', padding: 4 },
  coverTag: { position: 'absolute', bottom: 0, start: 0, end: 0, alignItems: 'center', paddingVertical: 2 },
  publish: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  fixedCat: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
});
