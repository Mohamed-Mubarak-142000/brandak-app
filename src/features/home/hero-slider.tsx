import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import type { PublicBrand } from '@/api/types';
import { useTheme } from '@/theme';
import { Icon, LoopCarousel, Tap, Text } from '@/ui';

interface Slide {
  key: string;
  eyebrow: string;
  title: string;
  cta: string;
  href: Href;
  image?: number;
  imageUrl?: string | null;
  colors: [string, string];
}

const PROMOS: Slide[] = [
  {
    key: 'discover',
    eyebrow: 'دكاكين',
    title: 'معارض ومخازن ومحلات\nوبراندات في مكان واحد',
    cta: 'اكتشف المتاجر',
    href: { pathname: '/explore', params: { tab: 'brands' } },
    image: require('../../../assets/illustrations/onboarding-discover.png'),
    colors: ['#FFE3CF', '#FFF6EE'],
  },
  {
    key: 'cod',
    eyebrow: 'من غير دفع مقدّم',
    title: 'ادفع كاش\nلما الطلب يوصلك',
    cta: 'ابدأ التسوق',
    href: '/explore',
    image: require('../../../assets/illustrations/onboarding-delivery.png'),
    colors: ['#E3F2E8', '#F6FBF7'],
  },
  {
    key: 'shop',
    eyebrow: 'سلة لكل متجر',
    title: 'اطلب من أكتر من متجر\nوتابع كل طلب',
    cta: 'تصفّح المنتجات',
    href: { pathname: '/explore', params: { sort: 'newest' } },
    image: require('../../../assets/illustrations/onboarding-shop.png'),
    colors: ['#FCE9D6', '#FFF8F0'],
  },
  {
    key: 'sell',
    eyebrow: 'عندك بيزنس؟',
    title: 'افتح متجرك\nوابدأ تبيع النهارده',
    cta: 'افتح متجرك',
    href: { pathname: '/(auth)/register', params: { intent: 'seller' } },
    image: require('../../../assets/illustrations/onboarding-sell.png'),
    colors: ['#F7E2D9', '#FFF4EF'],
  },
];

/** Top-of-home banner slider: promos plus the best-rated stores, auto-playing and looping. */
export function HeroSlider({ featured }: { featured: PublicBrand[] }) {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 640) - 32;
  const h = Math.round(w * 0.46);

  const slides: Slide[] = [
    ...PROMOS,
    ...featured.slice(0, 4).map<Slide>((b) => ({
      key: `brand-${b.id}`,
      eyebrow: 'متجر مميز',
      title: b.name,
      cta: 'زور المتجر',
      href: { pathname: '/brand/[slug]', params: { slug: b.slug } },
      imageUrl: b.coverUrl ?? b.logoUrl,
      colors: ['#FFE3CF', '#FFF6EE'],
    })),
  ];

  return (
    <LoopCarousel
      data={slides}
      keyOf={(s) => s.key}
      itemWidth={w}
      height={h}
      gap={12}
      inset={16}
      autoplayMs={4000}
      dots
      renderItem={(s) => (
        <Tap onPress={() => router.push(s.href)} pressScale={0.99} accessibilityLabel={`${s.title.replace('\n', ' ')}، ${s.cta}`} style={styles.flex}>
          <LinearGradient colors={t.dark ? [t.c.sunken, t.c.surface] : s.colors} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.card, { borderRadius: t.radius.xl }]}>
            <View style={styles.copy}>
              <Text variant="meta" weight="bold" color="accent">
                {s.eyebrow}
              </Text>
              <Text variant="section" numberOfLines={2} style={styles.title}>
                {s.title}
              </Text>
              <View style={[styles.cta, { backgroundColor: t.c.accent }]}>
                <Text variant="meta" weight="bold" color="onAccent">
                  {s.cta}
                </Text>
                <Icon as={ArrowLeft} size={14} color="onAccent" />
              </View>
            </View>
            <View style={styles.art}>
              {s.image ? (
                <Image source={s.image} style={styles.image} contentFit="contain" />
              ) : s.imageUrl ? (
                <Image source={s.imageUrl} style={[styles.image, { borderRadius: t.radius.lg }]} contentFit="cover" transition={200} />
              ) : null}
            </View>
          </LinearGradient>
        </Tap>
      )}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, overflow: 'hidden' },
  copy: { flex: 1.15, gap: 6 },
  title: { lineHeight: 30 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, height: 32, borderRadius: 999, marginTop: 4 },
  art: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
