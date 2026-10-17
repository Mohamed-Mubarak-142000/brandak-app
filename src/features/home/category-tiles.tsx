import { useRouter } from 'expo-router';
import {
  Baby,
  Bath,
  BookOpen,
  BrickWall,
  Cake,
  Car,
  CookingPot,
  Footprints,
  Gift,
  Hand,
  House,
  LayoutGrid,
  Pill,
  Plug,
  Puzzle,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  SprayCan,
  Watch,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';

import type { Category } from '@/api/types';
import { useTheme } from '@/theme';
import { LoopCarousel, Skeleton, Tap, Text } from '@/ui';

/** Category `icon` names from the API (seed-data.ts) → glyphs. Unknown names fall back to a grid. */
const ICONS: Record<string, LucideIcon> = {
  shirt: Shirt,
  footprints: Footprints,
  watch: Watch,
  sparkles: Sparkles,
  hand: Hand,
  baby: Baby,
  cake: Cake,
  gift: Gift,
  plug: Plug,
  sofa: Sofa,
  smartphone: Smartphone,
  car: Car,
  bath: Bath,
  home: House,
  'shopping-basket': ShoppingBasket,
  'cooking-pot': CookingPot,
  'brick-wall': BrickWall,
  'spray-can': SprayCan,
  'book-open': BookOpen,
  pill: Pill,
  puzzle: Puzzle,
  grid: LayoutGrid,
};

/** Warm, varied tile palettes [from, to, ink] so neighbouring tiles read as different sections. */
const TINTS: [string, string, string][] = [
  ['#FFE0CC', '#FFF3EA', '#C2500F'],
  ['#DDF1E6', '#F2FAF5', '#1D7348'],
  ['#E6E3FA', '#F5F4FD', '#4B3FB0'],
  ['#FCE3EA', '#FEF3F6', '#B02A54'],
  ['#DCEEF8', '#F1F8FC', '#1F6A93'],
  ['#F8EED2', '#FDF8EA', '#8A6400'],
];

export const TILE = 104;

/** Square picture tile for a category: soft gradient, decorative rings and a large glyph. */
function CategoryArt({ icon, index }: { icon?: string; index: number }) {
  const t = useTheme();
  const [from, to, ink] = TINTS[index % TINTS.length];
  const Glyph = (icon && ICONS[icon]) || LayoutGrid;
  const id = `g${index}`;
  return (
    <View style={[styles.art, { borderRadius: t.radius.lg }]}>
      <Svg width={TILE} height={TILE} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={id} x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.dark ? t.c.sunken : from} />
            <Stop offset="1" stopColor={t.dark ? t.c.surface : to} />
          </SvgGradient>
        </Defs>
        <Rect width={TILE} height={TILE} fill={`url(#${id})`} />
        <Circle cx={TILE * 0.85} cy={TILE * 0.15} r={TILE * 0.32} fill={ink} opacity={0.07} />
        <Circle cx={TILE * 0.1} cy={TILE * 0.95} r={TILE * 0.28} fill={ink} opacity={0.06} />
      </Svg>
      <Glyph size={TILE * 0.42} color={t.dark ? t.c.brand : ink} strokeWidth={1.6} />
    </View>
  );
}

/** "تسوّق حسب القسم": square picture tiles in an auto-playing, endless slider. */
export function CategoryTiles({ categories, loading }: { categories: Category[]; loading: boolean }) {
  const router = useRouter();
  if (loading)
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={TILE} height={TILE + 28} radius={16} />
        ))}
      </View>
    );
  if (!categories.length) return null;
  return (
    <LoopCarousel
      data={categories}
      keyOf={(c) => c._id}
      itemWidth={TILE}
      height={TILE + 30}
      gap={12}
      inset={16}
      autoplayMs={2600}
      renderItem={(c, i) => (
        <Tap
          onPress={() => router.push({ pathname: '/category/[id]', params: { id: c._id, name: c.nameAr } })}
          accessibilityLabel={`قسم ${c.nameAr}`}
          style={styles.tile}
        >
          <CategoryArt icon={c.icon} index={i} />
          <Text variant="ui" weight="semibold" align="center" numberOfLines={1}>
            {c.nameAr}
          </Text>
        </Tap>
      )}
    />
  );
}

const styles = StyleSheet.create({
  tile: { width: TILE, gap: 6 },
  art: { width: TILE, height: TILE, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  skeletons: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
});
