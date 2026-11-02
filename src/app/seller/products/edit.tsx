import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, Check, CircleAlert, ImagePlus, Plus, Ruler, Sparkles, Star, Trash2, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { api, ApiError, errorMessage } from '@/api/client';
import { qk, useAiStatus, useCampaigns, useCategories, useCategoryTemplate, useMyBrand, useSellerProduct } from '@/api/queries';
import type { BrandProduct, CategoryTemplate, ProductDraft, SpecValue, StoreType } from '@/api/types';
import { pickImages, uploadFile } from '@/api/upload';
import { CategoryPicker } from '@/features/catalog/category-picker';
import { categoryTree } from '@/features/catalog/category-tree';
import { swatchFor } from '@/features/catalog/variant-picker';
import { SpecsFields, type SpecDraft } from '@/features/seller/product-form/specs-fields';
import { cellKey, type Cells, combos, emptyCell, VariantBuilder } from '@/features/seller/product-form/variant-builder';
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
const num = (s: string) => {
  const n = Number(latinDigits(s).trim());
  return s.trim() !== '' && Number.isFinite(n) ? n : undefined;
};
const uniq = (xs: (string | undefined)[]) => [...new Set(xs.map((x) => x?.trim() ?? '').filter(Boolean))];

/** Until a category is picked (or while its template loads): free sizes and colours, sold by the piece. */
const fallbackTemplate = (storeType?: StoreType): CategoryTemplate => ({
  size: { label: 'المقاس', values: [], allowCustom: true },
  color: { label: 'اللون', allowCustom: true },
  specs: [],
  units: ['قطعة'],
  sizeGuide: null,
  wholesale: storeType === 'WAREHOUSE' ? 'required' : 'optional',
});
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
  const storeType = brand.data?.storeType;
  const categories = useCategories(storeType);

  // The store chose its sections; a product goes in a sub-category under one of them.
  const brandCats = brand.data?.categoryIds ?? [];
  const tree = useMemo(() => categoryTree(categories.data ?? []), [categories.data]);
  const ownLeaves = tree.leavesUnder(brandCats);
  const roots = brandCats.length && ownLeaves.length ? brandCats : [];
  const leaves = roots.length ? ownLeaves : tree.leavesUnder([]);

  const [images, setImages] = useState<Img[]>(() => p?.images.map((i) => ({ fileId: i.fileId, url: i.url, color: i.color ?? null })) ?? []);
  const [title, setTitle] = useState(p?.title ?? '');
  const [description, setDescription] = useState(p?.description ?? '');
  const initialCategory = p?.categoryId;
  const [pickedCategory, setCategoryId] = useState(p?.categoryId ?? '');
  // A store with a single sub-category to choose from doesn't pick it for every product.
  const categoryId = pickedCategory || (leaves.length === 1 ? leaves[0]._id : '');
  const tplQuery = useCategoryTemplate(categoryId || null, storeType);
  const loaded = tplQuery.data ?? fallbackTemplate(storeType);
  // A product filed before its category had a template keeps the sizes/colours it already has.
  const same = !!p && categoryId === initialCategory;
  const had = { sizes: uniq(p?.variants.map((v) => v.size) ?? []), colors: uniq(p?.variants.map((v) => v.color) ?? []) };
  const tpl: CategoryTemplate = {
    ...loaded,
    size: loaded.size ?? (same && had.sizes.length ? { label: 'المقاس', values: [], allowCustom: true } : null),
    color: loaded.color ?? (same && had.colors.length ? { label: 'اللون', allowCustom: true } : null),
  };
  const [price, setPrice] = useState(p ? String(p.price) : '');
  const [compareAt, setCompareAt] = useState(p?.compareAtPrice != null ? String(p.compareAtPrice) : '');
  // Variants are picked as sizes × colours, with one quantity per combination.
  const [sizes, setSizes] = useState<string[]>(() => uniq(p?.variants.map((v) => v.size) ?? []));
  const [colors, setColors] = useState<string[]>(() => uniq(p?.variants.map((v) => v.color) ?? []));
  const [cells, setCells] = useState<Cells>(() => {
    const out: Cells = {};
    for (const v of p?.variants ?? []) {
      out[cellKey(v.size?.trim() ?? '', v.color?.trim() ?? '')] = { id: v._id, stock: String(v.stock), price: v.price != null ? String(v.price) : '', sku: v.sku ?? '' };
    }
    // Combinations the product never had start sold out rather than blank.
    if (p) for (const c of combos(uniq(p.variants.map((v) => v.size)), uniq(p.variants.map((v) => v.color)))) out[c.key] ??= { ...emptyCell(), stock: '0' };
    return out;
  });
  // A category without sizes or colours drops them from the product.
  const activeSizes = tpl.size ? sizes : [];
  const activeColors = tpl.color ? colors : [];
  const variantList = combos(activeSizes, activeColors);
  const [specs, setSpecs] = useState<SpecDraft>(() =>
    Object.fromEntries((p?.specs ?? []).map((x) => [x.key, typeof x.value === 'boolean' ? x.value : String(x.value)])),
  );
  const [pickedUnit, setUnit] = useState(p?.unit ?? '');
  const unit = pickedUnit && tpl.units.includes(pickedUnit) ? pickedUnit : tpl.units[0];
  const [colorFor, setColorFor] = useState<number | null>(null);
  const colorOptions = activeColors;
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
  // Wholesale: a minimum per order and cheaper prices by quantity. Always on for warehouses.
  const wsRequired = tpl.wholesale === 'required';
  const [wsToggle, setWsOn] = useState(!!p?.wholesale);
  const wsOn = wsRequired || wsToggle;
  const [packUnit, setPackUnit] = useState(p?.wholesale?.pack?.unit ?? '');
  const [packQty, setPackQty] = useState(p?.wholesale?.pack ? String(p.wholesale.pack.qty) : '');
  const packUnits = ['كرتونة', 'دستة', 'سيري', 'باكو', 'شوال', 'شيكارة', 'علبة'].filter((u) => u !== unit);
  const [wsMin, setWsMin] = useState(p?.wholesale ? String(p.wholesale.minQty) : '');
  const [tiers, setTiers] = useState<TierDraft[]>(() =>
    p?.wholesale?.tiers.length ? p.wholesale.tiers.map((x) => ({ key: String(x.minQty), qty: String(x.minQty), price: String(x.price) })) : [newTier()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const ai = useAiStatus(!id);

  /** Fills every field from the model's suggestion; the seller reviews before saving. */
  const applyDraft = (d: ProductDraft) => {
    if (d.title) setTitle(d.title);
    if (d.description) setDescription(d.description);
    if (d.categoryId) setCategoryId(d.categoryId);
    if (d.tags.length) setTags(d.tags.join('، '));
    // A suggested market price only fills an empty price; the seller's own price wins.
    if (d.suggestedPrice && !num(price)) setPrice(String(d.suggestedPrice));
    const nextSizes = uniq(d.sizes).slice(0, 12);
    const nextColors = uniq(d.colors).slice(0, 8);
    setSizes(nextSizes);
    setColors(nextColors);
    // Keep stock the seller already typed for the same size/colour; start new ones at 10.
    setCells((current) => {
      const next = { ...current };
      for (const c of combos(nextSizes, nextColors)) next[c.key] ??= { ...emptyCell(), stock: '10' };
      return next;
    });
  };
  const draft = useMutation({
    mutationFn: async () => {
      let fileIds = images.filter((i) => i.fileId).map((i) => i.fileId!);
      if (!fileIds.length) {
        // No photos yet: pick up to 3 of the same product (more angles = a better description).
        const picked = await pickImages({ multiple: true, limit: 3 });
        if (!picked.length) return null;
        setImages((xs) => [...xs, ...picked.map((f) => ({ url: f.uri, uploading: true }))]);
        const uploaded = await Promise.all(
          picked.map(async (f) => {
            try {
              const res = await uploadFile(f, 'PRODUCT_IMAGE');
              setImages((xs) => xs.map((x) => (x.url === f.uri ? { fileId: res.id, url: res.url ?? f.uri } : x)));
              return res.id;
            } catch {
              setImages((xs) => xs.filter((x) => x.url !== f.uri));
              return null;
            }
          }),
        );
        fileIds = uploaded.filter((x): x is string => !!x);
        if (!fileIds.length) throw new ApiError(0, 'UPLOAD_FAILED', 'تعذّر رفع الصور. تأكد من الاتصال وجرّب تاني');
      }
      return api.post<ProductDraft>('/brand/ai/product-draft', { imageFileIds: fileIds.slice(0, 3) });
    },
    onSuccess: (d) => {
      if (!d) return;
      haptic.success();
      applyDraft(d);
      qc.invalidateQueries({ queryKey: ['seller', 'ai'] });
      toast.success(d.suggestedPrice ? 'كل البيانات اتملت، راجع السعر والمخزون قبل النشر' : 'البيانات اتملت، اكتب السعر وراجع المخزون');
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
    else if (categoryId !== initialCategory && !tree.isLeaf(categoryId)) e.category = 'اختار قسم فرعي أدق';
    for (const s of tpl.specs) {
      const v = specs[s.key];
      const filled = typeof v === 'boolean' || (typeof v === 'string' && v.trim() !== '');
      if (publish && s.required && !filled) e[`spec:${s.key}`] = `اكتب ${s.labelAr}`;
      else if (s.type === 'number' && typeof v === 'string' && v.trim() && num(v) == null) e[`spec:${s.key}`] = 'اكتب رقم';
    }
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
    if (variantList.length > 100) e.variants = 'لحد 100 اختيار للمنتج، قلل المقاسات أو الألوان';
    else if (variantList.some((c) => num(cells[c.key]?.stock ?? '') == null || num(cells[c.key]!.stock)! < 0)) e.variants = 'اكتب الكمية لكل اختيار (0 لو خلص)';
    if (wsOn) {
      const filled = tiers.filter((x) => x.qty.trim() || x.price.trim());
      const pack = num(packQty);
      if (packUnit && (!pack || pack < 2)) e.wholesale = `اكتب عدد ${unit === 'قطعة' ? 'القطع' : unit} في الـ${packUnit}`;
      // A warehouse sells retail too, but has to say what buying in quantity gets you.
      if (wsRequired && publish && !filled.length && !packUnit && (num(wsMin) ?? 1) <= 1) e.wholesale = 'المخازن لازم تحدد سعر جملة أو وحدة جملة (كرتونة مثلاً) قبل النشر';
      const sorted = filled.map((x) => ({ q: num(x.qty) ?? 0, pr: num(x.price) ?? 0 })).sort((a, b) => a.q - b.q);
      if (e.wholesale) {
        // Already explained above.
      } else if (num(wsMin) == null || num(wsMin)! < 1) e.wholesale = 'اكتب أقل كمية للطلب';
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
          pack: packUnit && num(packQty) ? { unit: packUnit, qty: Math.round(num(packQty)!) } : null,
        }
      : null,
    unit,
    specs: tpl.specs.flatMap((s): { key: string; value: SpecValue }[] => {
      const v = specs[s.key];
      if (typeof v === 'boolean') return s.type === 'boolean' ? [{ key: s.key, value: v }] : [];
      if (!v?.trim()) return [];
      return [{ key: s.key, value: s.type === 'number' ? num(v)! : v.trim() }];
    }),
    imageFileIds: images.filter((i) => i.fileId).map((i) => i.fileId!),
    // A colour that was renamed or removed from the variants falls back to "every colour".
    imageColors: images.filter((i) => i.fileId).map((i) => (i.color && colorOptions.includes(i.color) ? i.color : '')),
    variants: variantList.map((c) => {
      const cell = cells[c.key] ?? emptyCell();
      return {
        id: cell.id,
        size: c.size || undefined,
        color: c.color || undefined,
        sku: cell.sku.trim() || undefined,
        price: num(cell.price) ?? null,
        stock: Math.round(num(cell.stock) ?? 0),
      };
    }),
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
                صوّر المنتج (لحد 3 صور من زوايا مختلفة) والذكاء الاصطناعي يملالك كل البيانات: الاسم، الوصف، القسم، المقاسات والألوان، كلمات البحث، وسعر مقترح. انت بس تراجع. باقي النهارده {ai.data.remaining}.
              </Text>
            </View>
          </View>
          <Button
            label={images.length ? 'املا كل البيانات من الصور' : 'اختار صور المنتج'}
            icon={Sparkles}
            loading={draft.isPending}
            disabled={!ai.data.remaining || images.some((i) => i.uploading)}
            onPress={() => draft.mutate()}
          />
          {draft.isPending && (
            <Text variant="meta" color="ink3" align="center">
              بنقرا الصور ونكتب البيانات... ممكن ياخد لحد نص دقيقة
            </Text>
          )}
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

      {categories.isLoading || brand.isLoading ? (
        <Skeleton height={52} />
      ) : leaves.length === 1 && categoryId === leaves[0]._id ? (
        <View style={[styles.fixedCat, { backgroundColor: t.c.sunken, borderRadius: t.radius.md }]}>
          <Text variant="ui" color="ink2" style={styles.flex}>
            القسم: <Text variant="ui" weight="bold">{tree.path(categoryId)}</Text>
          </Text>
          <Text variant="meta" color="ink3">
            من إعدادات المتجر
          </Text>
        </View>
      ) : (
        <CategoryPicker
          label="القسم"
          categories={categories.data ?? []}
          roots={roots}
          leafOnly
          value={categoryId}
          onChange={setCategoryId}
          error={errors.category}
          hint="القسم بيحدد المقاسات والمواصفات اللي هتكتبها، وبيساعد العميل يلاقي المنتج"
        />
      )}

      {categoryId ? (
        tplQuery.isLoading ? (
          <Skeleton height={120} />
        ) : (
          <SpecsFields
            specs={tpl.specs}
            values={specs}
            onChange={setSpecs}
            errors={Object.fromEntries(Object.entries(errors).flatMap(([k, v]) => (k.startsWith('spec:') ? [[k.slice(5), v]] : [])))}
          />
        )
      ) : null}

      {tpl.units.length > 1 && (
        <View style={styles.gap}>
          <Text variant="ui" color="ink2">
            بيتباع بـ
          </Text>
          <View style={styles.wrap}>
            {tpl.units.map((u) => (
              <Chip key={u} label={u} selected={unit === u} onPress={() => setUnit(u)} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label={unit === 'قطعة' ? 'السعر (ج.م)' : `سعر الـ${unit} (ج.م)`} placeholder="مثال: 350" value={price} onChangeText={setPrice} keyboardType="decimal-pad" ltr error={errors.price} />
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
        <Text variant="bodyStrong">{[tpl.size?.label, tpl.color?.label].filter(Boolean).join(' و') || 'الكمية'}{tpl.size || tpl.color ? ' والكميات' : ''}</Text>
        <VariantBuilder
          template={tpl}
          sizes={activeSizes}
          colors={activeColors}
          cells={cells}
          onSizes={setSizes}
          onColors={setColors}
          onCells={setCells}
          unit={unit}
          error={errors.variants}
        />
        {tpl.sizeGuide ? (
          <View style={[styles.guide, { backgroundColor: t.c.sunken, borderRadius: t.radius.md }]}>
            <View style={styles.between}>
              <Text variant="ui" weight="semibold">
                دليل المقاسات
              </Text>
              <Ruler size={18} color={t.c.ink3} />
            </View>
            <Text variant="meta" color="ink2">
              {tpl.sizeGuide}
            </Text>
            <Text variant="meta" color="ink3">
              بيظهر للعميل في صفحة المنتج
            </Text>
          </View>
        ) : null}
      </View>

      {/* Wholesale */}
      <View style={[styles.publish, { borderColor: wsOn ? t.c.brand : t.c.line, backgroundColor: t.c.surface, borderRadius: t.radius.md }]}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">أسعار الجملة</Text>
          <Text variant="meta" color="ink3">
            {wsRequired
              ? 'أساسية للمخازن: العميل يشتري قطاعي بالسعر العادي، وكل ما الكمية تزيد السعر يقل'
              : 'أقل كمية للطلب، وسعر أقل كل ما الكمية تزيد (كل المقاسات بتتحسب مع بعض)'}
          </Text>
        </View>
        {!wsRequired && (
          <Switch value={wsOn} onValueChange={setWsOn} trackColor={{ true: t.c.accent, false: t.c.lineStrong }} thumbColor="#fff" accessibilityLabel="أسعار الجملة" />
        )}
      </View>
      {wsOn && (
        <Card style={styles.gap}>
          <TextField
            label={`أقل كمية للطلب (${unit})`}
            placeholder={wsRequired ? '1' : 'مثال: 6'}
            value={wsMin}
            onChangeText={setWsMin}
            keyboardType="number-pad"
            ltr
            hint={wsRequired ? 'اكتب 1 لو بتبيع قطاعي كمان' : 'اكتب 1 لو مفيش حد أدنى'}
          />
          <Text variant="ui" color="ink2">
            وحدة الجملة
          </Text>
          <View style={styles.wrap}>
            <Chip label="من غير" selected={!packUnit} onPress={() => setPackUnit('')} />
            {packUnits.map((u) => (
              <Chip key={u} label={u} selected={packUnit === u} onPress={() => setPackUnit(u)} />
            ))}
          </View>
          {packUnit ? (
            <TextField
              label={`كام ${unit} في الـ${packUnit}؟`}
              placeholder="مثال: 24"
              value={packQty}
              onChangeText={setPackQty}
              keyboardType="number-pad"
              ltr
              hint={num(packQty) && num(price) ? `سعر الـ${packUnit} بالسعر العادي: ${Math.round(num(packQty)! * num(price)!)} ج.م` : undefined}
            />
          ) : null}
          {tiers.map((x, i) => (
            <View key={x.key} style={[styles.row, styles.center]}>
              <View style={styles.flex}>
                <TextField label={i === 0 ? 'من كمية' : ' '} placeholder="12" value={x.qty} onChangeText={(s) => setTiers((xs) => xs.map((y) => (y.key === x.key ? { ...y, qty: s } : y)))} keyboardType="number-pad" ltr />
              </View>
              <View style={styles.flex}>
                <TextField label={i === 0 ? `سعر الـ${unit}` : ' '} placeholder="80" value={x.price} onChangeText={(s) => setTiers((xs) => xs.map((y) => (y.key === x.key ? { ...y, price: s } : y)))} keyboardType="decimal-pad" ltr />
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
  guide: { gap: 6, padding: 12 },
  fixedCat: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
});
