import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CircleAlert, CircleCheck, Download, FileSpreadsheet, ImageIcon, RefreshCw, TriangleAlert, Upload } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { api, API_BASE, errorMessage } from '@/api/client';
import { uploadDocument } from '@/api/upload';
import { formatMoney } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { AppBar, Badge, Banner, Button, Card, EmptyState, Icon, Screen, Text } from '@/ui';

interface PickedFile {
  uri: string;
  name: string;
  type: string;
}

interface ImportItem {
  key: string;
  lines: number[];
  title: string;
  categoryName: string | null;
  price: number | null;
  imageUrls: string[];
  variants: { size: string | null; color: string | null; stock: number }[];
  state: 'ready' | 'invalid' | 'duplicate';
  errors: string[];
  warnings: string[];
}

interface Preview {
  items: ImportItem[];
  summary: { rows: number; products: number; ready: number; invalid: number; duplicates: number; withImages: number; publishSlots: number | null };
}

interface CommitResult {
  created: { id: string; title: string; status: 'ACTIVE' | 'DRAFT'; imageUrls: string[]; imageColors?: (string | null)[] }[];
  skipped: { title: string; lines: number[]; reason: string }[];
  published: number;
  drafts: number;
}

interface ImagesResult {
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  imported: number;
  failed: { url: string; code: string }[];
  publishError: string | null;
}

const TEMPLATE_URL = `${API_BASE}/product-import/template.xlsx`;
const FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/comma-separated-values',
  'application/csv',
];

type Phase = 'intro' | 'preview' | 'importing' | 'done';

/** Import many products from one Excel/CSV file: template → pick → preview → import → images. */
export default function ImportProducts() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>('intro');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publish, setPublish] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' });
  const [result, setResult] = useState<{ commit: CommitResult; published: number; images: number; imageFailures: number; publishBlocked: number } | null>(null);

  const pick = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: FILE_TYPES, copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if (!/\.(xlsx|csv)$/i.test(a.name)) {
      setError('اختار ملف Excel بصيغة .xlsx أو ملف .csv');
      return;
    }
    const picked = { uri: a.uri, name: a.name, type: a.mimeType ?? (a.name.toLowerCase().endsWith('.csv') ? 'text/csv' : FILE_TYPES[0]) };
    setFile(picked);
    setChecking(true);
    try {
      const p = await uploadDocument<Preview>('/brand/products/import/preview', picked);
      setPreview(p);
      setPublish(p.summary.publishSlots != null && p.summary.publishSlots > 0);
      setPhase('preview');
      haptic.success();
    } catch (e) {
      haptic.error();
      setError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  };

  const runImport = async () => {
    if (!file || !preview) return;
    setPhase('importing');
    setProgress({ done: 0, total: 1, label: 'بنضيف المنتجات...' });
    try {
      const commit = await uploadDocument<CommitResult>('/brand/products/import', file, { publish: String(publish) });
      const withImages = commit.created.filter((c) => c.imageUrls.length);
      let images = 0;
      let imageFailures = 0;
      let published = 0;
      let publishBlocked = 0;
      setProgress({ done: 0, total: withImages.length, label: 'بنحمّل صور المنتجات...' });
      // One product per request keeps every call well under the server's time limit.
      for (let i = 0; i < withImages.length; i++) {
        const c = withImages[i];
        try {
          const r = await api.post<ImagesResult>(`/brand/products/${c.id}/import-images`, { urls: c.imageUrls, colors: c.imageColors?.map((x) => x ?? ''), publish: c.status === 'ACTIVE' });
          images += r.imported;
          imageFailures += r.failed.length;
          if (r.status === 'ACTIVE') published++;
          else if (c.status === 'ACTIVE') publishBlocked++;
        } catch {
          imageFailures += c.imageUrls.length;
          if (c.status === 'ACTIVE') publishBlocked++;
        }
        setProgress({ done: i + 1, total: withImages.length, label: `بنحمّل صور المنتجات... (${i + 1} من ${withImages.length})` });
      }
      qc.invalidateQueries({ queryKey: ['seller', 'products'] });
      qc.invalidateQueries({ queryKey: ['seller', 'overview'] });
      setResult({ commit, published, images, imageFailures, publishBlocked });
      setPhase('done');
      haptic.success();
    } catch (e) {
      haptic.error();
      setError(errorMessage(e));
      setPhase('preview');
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setPhase('intro');
  };

  if (phase === 'importing')
    return (
      <Screen header={<AppBar title="استيراد المنتجات" back={false} />}>
        <View style={styles.center}>
          <Icon as={FileSpreadsheet} size={48} color="accent" />
          <Text variant="section" align="center">
            {progress.label}
          </Text>
          <ProgressBar value={progress.total ? progress.done / progress.total : 0} />
          <Text variant="meta" color="ink3" align="center">
            خليك في الصفحة لحد ما نخلص
          </Text>
        </View>
      </Screen>
    );

  if (phase === 'done' && result) {
    const { commit } = result;
    return (
      <Screen header={<AppBar title="استيراد المنتجات" back={false} />} footer={<Button label="رجوع للمنتجات" onPress={() => router.back()} />}>
        <EmptyState
          art="success"
          title={`اتضاف ${commit.created.length} منتج`}
          body={[
            result.published ? `${result.published} اتنشر في المتجر` : null,
            commit.created.length - result.published ? `${commit.created.length - result.published} اتحفظ مسودة` : null,
            result.images ? `${result.images} صورة اتحملت` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        {result.imageFailures > 0 && (
          <Banner icon={TriangleAlert} tone="warning" title={`${result.imageFailures} صورة محملتش`} body="الرابط ممكن يكون مش مباشر للصورة أو أكبر من 4 ميجا. افتح المنتج وضيف الصور من موبايلك." />
        )}
        {result.publishBlocked > 0 && (
          <Banner
            icon={TriangleAlert}
            tone="warning"
            title={`${result.publishBlocked} منتج متنشرش`}
            body="إما صوره محملتش أو باقتك وصلت للحد. تلاقيهم في المسودات."
            action="الباقات"
            onAction={() => router.push('/seller/plans')}
          />
        )}
        {commit.skipped.length > 0 && (
          <Card style={styles.gap}>
            <Text variant="bodyStrong">اتخطّينا {commit.skipped.length} منتج</Text>
            {commit.skipped.slice(0, 30).map((s) => (
              <Text key={`${s.title}-${s.lines[0]}`} variant="meta" color="ink2">
                صف {s.lines.join('، ')} · {s.title}: {s.reason}
              </Text>
            ))}
          </Card>
        )}
      </Screen>
    );
  }

  if (phase === 'preview' && preview) {
    const s = preview.summary;
    const sorted = [...preview.items].sort((a, b) => order(a.state) - order(b.state));
    const canPublish = s.publishSlots != null && s.publishSlots > 0;
    return (
      <Screen
        header={<AppBar title="مراجعة الملف" />}
        footer={
          <View style={styles.footer}>
            <Button label="ملف تاني" icon={RefreshCw} variant="secondary" block={false} onPress={reset} />
            <Button label={s.ready ? `استيراد ${s.ready} منتج` : 'مفيش منتجات جاهزة'} icon={Upload} disabled={!s.ready} onPress={runImport} style={styles.flex} />
          </View>
        }
      >
        <Text variant="meta" color="ink3">
          {file?.name} · {s.rows} صف · {s.products} منتج
        </Text>
        <View style={styles.tiles}>
          <Tile n={s.ready} label="جاهز للاستيراد" color="success" />
          <Tile n={s.invalid} label="فيه أخطاء" color="danger" />
          <Tile n={s.duplicates} label="موجود قبل كده" color="ink3" />
        </View>
        {error && <Banner icon={CircleAlert} tone="danger" title={error} />}
        {s.invalid > 0 && <Banner icon={TriangleAlert} tone="warning" title="المنتجات اللي فيها أخطاء مش هتتضاف" body="صلّحها في الملف وارفعه تاني، أو كمّل بالجاهز بس. المنتجات اللي اتضافت مش هتتكرر." />}

        <View style={[styles.publish, { borderColor: t.c.line, backgroundColor: t.c.surface, borderRadius: t.radius.md }]}>
          <View style={styles.flex}>
            <Text variant="bodyStrong">انشر في المتجر</Text>
            <Text variant="meta" color="ink3">
              {!canPublish
                ? s.publishSlots == null
                  ? 'محتاج باقة سارية عشان تنشر. هيتحفظوا مسودات.'
                  : 'باقتك وصلت للحد. هيتحفظوا مسودات.'
                : `باقتك تسمح بـ ${s.publishSlots} منتج كمان. المنتجات اللي من غير صور هتتحفظ مسودة.`}
            </Text>
          </View>
          <Switch value={publish && canPublish} disabled={!canPublish} onValueChange={setPublish} trackColor={{ true: t.c.accent, false: t.c.lineStrong }} thumbColor="#fff" accessibilityLabel="انشر في المتجر" />
        </View>

        {sorted.map((item) => (
          <ItemCard key={item.key} item={item} />
        ))}
      </Screen>
    );
  }

  return (
    <Screen header={<AppBar title="استيراد من ملف" />} footer={<Button label="اختار الملف" icon={FileSpreadsheet} loading={checking} onPress={pick} />}>
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: t.c.accentSoft }]}>
          <Icon as={FileSpreadsheet} size={34} color="accent" />
        </View>
        <Text variant="section" align="center">
          ضيف منتجاتك كلها مرة واحدة
        </Text>
        <Text variant="ui" color="ink2" align="center">
          بدل ما تدخل منتج منتج، املا ملف Excel وارفعه. هتشوف مراجعة قبل ما أي حاجة تتحفظ.
        </Text>
      </View>
      {error && <Banner icon={CircleAlert} tone="danger" title={error} />}

      <Card style={styles.gap}>
        <Step n={1} title="حمّل القالب" body="ملف Excel فيه الأعمدة وأمثلة وقائمة الأقسام." />
        <Button label="تحميل القالب" icon={Download} variant="soft" size="md" onPress={() => WebBrowser.openBrowserAsync(TEMPLATE_URL).catch(() => undefined)} />
        <Step n={2} title="املا منتجاتك" body="كل صف = مقاس أو لون. الصفوف اللي ليها نفس الاسم بتبقى منتج واحد." />
        <Step n={3} title="ارفع الملف وراجع" body="بنقولك على أي غلط في أنهي صف قبل الاستيراد." />
      </Card>

      <Card style={styles.gap}>
        <Text variant="bodyStrong">الأعمدة</Text>
        {[
          ['اسم المنتج، السعر، المخزون', 'لازم يتملوا'],
          ['المقاس، اللون، سعر مختلف للمقاس، SKU', 'لكل صف'],
          ['القسم', 'فاضي = قسم متجرك لو ليه قسم واحد'],
          ['السعر قبل الخصم، الوصف، كلمات مفتاحية', 'اختياري'],
          ['روابط الصور', 'روابط https مباشرة. صور كل لون في صف اللون ده'],
        ].map(([cols, note]) => (
          <View key={cols} style={styles.colRow}>
            <Text variant="ui" weight="semibold" style={styles.flex}>
              {cols}
            </Text>
            <Text variant="meta" color="ink3">
              {note}
            </Text>
          </View>
        ))}
        <Text variant="meta" color="ink3">
          لحد 500 صف في الملف · .xlsx أو .csv · لحد 4 ميجا
        </Text>
      </Card>
    </Screen>
  );
}

const order = (s: ImportItem['state']) => (s === 'invalid' ? 0 : s === 'duplicate' ? 2 : 1);

function ItemCard({ item }: { item: ImportItem }) {
  const t = useTheme();
  const tone = item.state === 'ready' ? 'success' : item.state === 'invalid' ? 'danger' : 'neutral';
  const label = item.state === 'ready' ? 'جاهز' : item.state === 'invalid' ? 'فيه أخطاء' : 'موجود قبل كده';
  const sizes = item.variants.map((v) => [v.size, v.color].filter(Boolean).join(' / ')).filter(Boolean);
  return (
    <Animated.View entering={FadeIn.duration(160)}>
      <Card style={[styles.gapSm, item.state === 'invalid' && { borderColor: t.c.danger }]}>
        <View style={styles.itemHead}>
          <Text variant="ui" weight="bold" style={styles.flex} numberOfLines={2}>
            {item.title || 'من غير اسم'}
          </Text>
          <Badge label={label} tone={tone} />
        </View>
        <Text variant="meta" color="ink3">
          صف {item.lines.join('، ')}
          {item.price != null ? ` · ${formatMoney(item.price)}` : ''}
          {item.categoryName ? ` · ${item.categoryName}` : ''}
          {` · ${item.variants.reduce((n, v) => n + v.stock, 0)} قطعة`}
        </Text>
        {sizes.length > 0 && (
          <Text variant="meta" color="ink2" numberOfLines={2}>
            {sizes.join(' · ')}
          </Text>
        )}
        {item.imageUrls.length > 0 && (
          <View style={styles.inline}>
            <Icon as={ImageIcon} size={14} color="ink3" />
            <Text variant="meta" color="ink3">
              {item.imageUrls.length} صورة
            </Text>
          </View>
        )}
        {item.errors.map((e) => (
          <View key={e} style={styles.inline}>
            <Icon as={CircleAlert} size={14} color="danger" />
            <Text variant="meta" color="danger" style={styles.flex}>
              {e}
            </Text>
          </View>
        ))}
        {item.state !== 'invalid' &&
          item.warnings.map((w) => (
            <View key={w} style={styles.inline}>
              <Icon as={item.state === 'ready' ? CircleCheck : TriangleAlert} size={14} color="ink3" />
              <Text variant="meta" color="ink3" style={styles.flex}>
                {w}
              </Text>
            </View>
          ))}
      </Card>
    </Animated.View>
  );
}

function Tile({ n, label, color }: { n: number; label: string; color: 'success' | 'danger' | 'ink3' }) {
  const t = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: t.c.surface, borderColor: t.c.line, borderRadius: t.radius.md }]}>
      <Text variant="page" color={color}>
        {n}
      </Text>
      <Text variant="meta" color="ink2">
        {label}
      </Text>
    </View>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  const t = useTheme();
  return (
    <View style={styles.step}>
      <View style={[styles.stepNum, { backgroundColor: t.c.accentSoft }]}>
        <Text variant="ui" weight="bold" color="accent">
          {n}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text variant="ui" weight="bold">
          {title}
        </Text>
        <Text variant="meta" color="ink2">
          {body}
        </Text>
      </View>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  const t = useTheme();
  const fill = useAnimatedStyle(() => ({ width: withTiming(`${Math.max(4, value * 100)}%`, { duration: 250 }) }));
  return (
    <View style={[styles.track, { backgroundColor: t.c.line }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <Animated.View style={[styles.fill, { backgroundColor: t.c.brand }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 12 },
  gapSm: { gap: 6 },
  footer: { flexDirection: 'row', gap: 10 },
  hero: { alignItems: 'center', gap: 8 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  stepNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, padding: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  publish: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  itemHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 80 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', alignSelf: 'stretch' },
  fill: { height: '100%', borderRadius: 4 },
});
