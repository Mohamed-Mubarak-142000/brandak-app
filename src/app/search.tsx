import { useRouter } from 'expo-router';
import { ArrowRight, Clock, Search as SearchIcon, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flatPages, useBrands, useCategories, useProducts } from '@/api/queries';
import { BrandBubble } from '@/features/catalog/brand-card';
import { ProductGrid } from '@/features/catalog/product-grid';
import { PREF, prefs } from '@/lib/storage';
import { useTheme } from '@/theme';
import { Chip, EmptyState, IconButton, SectionHeader, Tap, Text } from '@/ui';

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function SearchScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const [recent, setRecent] = useState<string[]>(() => prefs.get<string[]>(PREF.recentSearches, []));
  const categories = useCategories();
  const products = useProducts({ q }, 20, !!q);
  const brands = useBrands({ q }, 10, !!q);
  const brandHits = useMemo(() => (q ? flatPages(brands.data) : []), [q, brands.data]);

  useEffect(() => {
    if (q.length < 2) return;
    const id = setTimeout(() => {
      setRecent((r) => {
        const next = [q, ...r.filter((x) => x !== q)].slice(0, 8);
        prefs.set(PREF.recentSearches, next);
        return next;
      });
    }, 1200);
    return () => clearTimeout(id);
  }, [q]);

  const clearRecent = () => {
    prefs.set(PREF.recentSearches, []);
    setRecent([]);
  };

  return (
    <View style={[styles.flex, { backgroundColor: t.c.ground, paddingTop: insets.top + 6 }]}>
      <View style={styles.bar}>
        <IconButton icon={ArrowRight} label="رجوع" onPress={() => router.back()} />
        <View style={[styles.field, { backgroundColor: t.c.surface, borderColor: t.c.brand, borderRadius: t.radius.md }]}>
          <SearchIcon size={20} color={t.c.ink3} />
          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            placeholder="ابحث عن منتج أو براند..."
            placeholderTextColor={t.c.ink3}
            returnKeyType="search"
            style={[t.type.body, styles.input, { color: t.c.ink }]}
            accessibilityLabel="بحث"
            selectionColor={t.c.brand}
          />
          {!!text && (
            <Tap onPress={() => setText('')} hitSlop={10} pressScale={1} accessibilityLabel="مسح البحث">
              <X size={18} color={t.c.ink3} />
            </Tap>
          )}
        </View>
      </View>

      {!q ? (
        <ScrollView contentContainerStyle={styles.idle} keyboardShouldPersistTaps="handled">
          {recent.length > 0 && (
            <View style={styles.gap}>
              <SectionHeader title="عمليات بحث سابقة" action="مسح" onAction={clearRecent} />
              <View style={styles.wrap}>
                {recent.map((r) => (
                  <Chip key={r} label={r} icon={Clock} onPress={() => setText(r)} />
                ))}
              </View>
            </View>
          )}
          <View style={styles.gap}>
            <SectionHeader title="تصفّح الأقسام" />
            <View style={styles.wrap}>
              {(categories.data ?? [])
                .filter((c) => c.isActive && !c.parentId)
                .map((c) => (
                  <Chip key={c._id} label={c.nameAr} onPress={() => router.push({ pathname: '/category/[id]', params: { id: c._id, name: c.nameAr } })} />
                ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ProductGrid
          items={flatPages(products.data)}
          isLoading={products.isLoading}
          error={products.error}
          onRetry={() => products.refetch()}
          onEndReached={() => products.hasNextPage && !products.isFetchingNextPage && products.fetchNextPage()}
          loadingMore={products.isFetchingNextPage}
          header={
            brandHits.length ? (
              <View style={styles.brandHits}>
                <Text variant="bodyStrong">براندات</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bubbles}>
                  {brandHits.map((b) => (
                    <BrandBubble key={b.id} brand={b} />
                  ))}
                </ScrollView>
                <Text variant="bodyStrong">منتجات</Text>
              </View>
            ) : (
              <View style={{ height: 12 }} />
            )
          }
          empty={<EmptyState art="search" title={`مفيش نتايج لـ "${q}"`} body="جرّب كلمة تانية أو اكتبها بشكل مختلف." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingBottom: 10 },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 12, borderWidth: 1.5, marginEnd: 8 },
  input: { flex: 1, height: 46 },
  idle: { padding: 16, gap: 24 },
  gap: { gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  brandHits: { gap: 10, paddingTop: 8, paddingBottom: 12 },
  bubbles: { gap: 8 },
});
