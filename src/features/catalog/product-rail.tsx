import { FlatList, StyleSheet, View } from 'react-native';

import type { ProductCard as Product } from '@/api/types';
import { SectionHeader } from '@/ui';
import { AdCard } from './ad-card';
import { ProductCard } from './product-card';
import { ProductSkeleton } from './product-grid';

const GAP = 12;

/** Horizontal product row with a section header; ads get the banner-style card. Hidden once loaded empty. */
export function ProductRail({
  title,
  items,
  loading,
  width,
  aspect,
  snap,
  action = 'عرض الكل',
  onMore,
}: {
  title: string;
  items: Product[];
  loading?: boolean;
  width: number;
  aspect?: number;
  /** Stop on each card (for rails of full-width cards). */
  snap?: boolean;
  action?: string;
  onMore?: () => void;
}) {
  if (!loading && !items.length) return null;
  return (
    <View style={styles.gap}>
      <View style={styles.mx}>
        <SectionHeader title={title} action={onMore ? action : undefined} onAction={onMore} />
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) =>
          item.sponsored ? <AdCard product={item} width={width} /> : <ProductCard product={item} width={width} aspect={aspect} />
        }
        contentContainerStyle={styles.rail}
        showsHorizontalScrollIndicator={false}
        {...(snap && { snapToInterval: width + GAP, snapToAlignment: 'start', decelerationRate: 'fast', disableIntervalMomentum: true })}
        ListEmptyComponent={
          <View style={styles.row}>
            {[0, 1, 2].map((i) => (
              <ProductSkeleton key={i} width={width} aspect={aspect} />
            ))}
          </View>
        }
      />
    </View>
  );
}

/** Paid placements only, always as ad cards. */
export function AdRail({ title, items, width }: { title: string; items: Product[]; width: number }) {
  if (!items.length) return null;
  return (
    <View style={styles.gap}>
      <View style={styles.mx}>
        <SectionHeader title={title} />
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <AdCard product={item} width={width} />}
        contentContainerStyle={styles.rail}
        showsHorizontalScrollIndicator={false}
        snapToInterval={width + GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  mx: { marginHorizontal: 16 },
  rail: { paddingHorizontal: 16, gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
});
