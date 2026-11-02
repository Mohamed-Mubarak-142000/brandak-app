import { Check, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Category } from '@/api/types';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Icon, Sheet, Tap, Text, TextField } from '@/ui';
import { categoryTree } from './category-tree';

/**
 * Picks a category by walking the tree (section › category › sub-category) in a sheet, with a
 * search across every level. Sellers must reach the end of a branch (`leafOnly`); shoppers can
 * stop anywhere to browse a whole section.
 */
export function CategoryPicker({
  label,
  categories,
  value,
  onChange,
  roots = [],
  leafOnly = false,
  error,
  hint,
  placeholder = 'اختار القسم',
}: {
  label: string;
  categories: Category[];
  value: string | null | undefined;
  onChange: (id: string) => void;
  /** Limit to these sections (the store's own); empty = everything. */
  roots?: string[];
  leafOnly?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  const t = useTheme();
  const tree = useMemo(() => categoryTree(categories), [categories]);
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<string | null>(null);
  const [q, setQ] = useState('');

  // The levels the store can see: its sections, or the whole top level.
  const top = roots.length ? roots.map((r) => tree.byId.get(r)).filter((c): c is Category => !!c) : tree.children(null);
  // A store with one section starts inside it.
  const start = top.length === 1 && !tree.isLeaf(top[0]._id) ? top[0]._id : null;
  const rows = at ? tree.children(at) : start ? tree.children(start) : top;
  const trail = at ? [...tree.ancestors(at), tree.byId.get(at)!].filter((c) => c && c._id !== start) : [];
  const inScope = (id: string) => !roots.length || [...tree.ancestors(id).map((a) => a._id), id].some((a) => roots.includes(a));

  const found = useMemo(() => {
    const needle = normalize(q);
    if (!needle) return [];
    return [...tree.byId.values()]
      .filter((c) => inScope(c._id) && (!leafOnly || tree.isLeaf(c._id)) && normalize(tree.path(c._id)).includes(needle))
      .slice(0, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tree, roots, leafOnly]);

  const pick = (id: string) => {
    haptic.tap();
    onChange(id);
    setOpen(false);
  };
  const enter = (c: Category) => (tree.isLeaf(c._id) ? pick(c._id) : setAt(c._id));
  const show = () => {
    // Reopen where the current choice lives.
    const parent = value ? tree.byId.get(value)?.parentId : null;
    setAt(parent && parent !== start ? parent : null);
    setQ('');
    setOpen(true);
  };

  const current = value ? tree.byId.get(value) : undefined;
  const needsMore = !!current && leafOnly && !tree.isLeaf(current._id);
  const back = at ? tree.byId.get(at)?.parentId ?? null : null;

  return (
    <View style={styles.wrap}>
      <Text variant="ui" color={error ? 'danger' : 'ink2'}>
        {label}
      </Text>
      <Tap
        onPress={show}
        pressScale={1}
        accessibilityRole="combobox"
        accessibilityLabel={`${label}: ${current ? tree.path(current._id) : placeholder}`}
        style={[
          styles.box,
          { borderColor: error || needsMore ? t.c.danger : t.c.lineStrong, backgroundColor: t.c.surface, borderRadius: t.radius.md, borderWidth: error ? 1.5 : 1 },
        ]}
      >
        <View style={styles.flex}>
          {current ? (
            <>
              {tree.ancestors(current._id).length > 0 && (
                <Text variant="meta" color="ink3" numberOfLines={1}>
                  {tree.ancestors(current._id).map((a) => a.nameAr).join(' › ')}
                </Text>
              )}
              <Text variant="body" numberOfLines={1}>
                {current.nameAr}
              </Text>
            </>
          ) : (
            <Text variant="body" color="ink3">
              {placeholder}
            </Text>
          )}
        </View>
        <Icon as={ChevronDown} size={20} color="ink3" />
      </Tap>
      {error || needsMore ? (
        <Text variant="meta" color="danger">
          {error ?? 'حدد قسم فرعي أدق عشان العميل يلاقي المنتج بسهولة'}
        </Text>
      ) : hint ? (
        <Text variant="meta" color="ink3">
          {hint}
        </Text>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <TextField label="بحث" icon={Search} placeholder="مثال: تيشيرت، ثلاجة، أرز" value={q} onChangeText={setQ} />
        {q.trim() ? (
          found.length ? (
            found.map((c) => (
              <Row key={c._id} title={c.nameAr} subtitle={tree.ancestors(c._id).map((a) => a.nameAr).join(' › ')} selected={c._id === value} onPress={() => pick(c._id)} />
            ))
          ) : (
            <Text variant="meta" color="ink3" align="center" style={styles.empty}>
              مفيش قسم بالاسم ده
            </Text>
          )
        ) : (
          <>
            {at && (
              <View style={styles.trail}>
                <Tap onPress={() => setAt(back === start ? null : back)} accessibilityLabel="رجوع" style={styles.backBtn}>
                  <Icon as={ChevronRight} size={20} color="accent" />
                  <Text variant="ui" color="accent">
                    رجوع
                  </Text>
                </Tap>
                <Text variant="meta" color="ink3" numberOfLines={1} style={styles.flex}>
                  {trail.map((c) => c.nameAr).join(' › ')}
                </Text>
              </View>
            )}
            {/* Shoppers can take a whole section at once. */}
            {!leafOnly && (at || start) && (
              <Row title={`كل «${tree.byId.get((at ?? start)!)?.nameAr}»`} selected={value === (at ?? start)} onPress={() => pick((at ?? start)!)} />
            )}
            {rows.map((c) => (
              <Row
                key={c._id}
                title={c.nameAr}
                subtitle={tree.isLeaf(c._id) ? undefined : tree.children(c._id).slice(0, 4).map((x) => x.nameAr).join('، ') + (tree.children(c._id).length > 4 ? '...' : '')}
                selected={c._id === value || (!!value && tree.ancestors(value).some((a) => a._id === c._id))}
                more={!tree.isLeaf(c._id)}
                onPress={() => enter(c)}
              />
            ))}
          </>
        )}
      </Sheet>
    </View>
  );
}

function Row({ title, subtitle, selected, more, onPress }: { title: string; subtitle?: string; selected: boolean; more?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Tap
      pressScale={1}
      onPress={onPress}
      accessibilityRole={more ? 'button' : 'radio'}
      accessibilityState={{ selected }}
      style={[styles.option, { borderColor: selected ? t.c.brand : t.c.line, backgroundColor: selected ? t.c.accentSoft : t.c.surface, borderRadius: t.radius.md }]}
    >
      <View style={styles.flex}>
        <Text variant="bodyStrong" color={selected ? 'accent' : 'ink'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="meta" color="ink3" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {more ? <Icon as={ChevronLeft} size={20} color="ink3" /> : selected ? <Icon as={Check} color="accent" /> : null}
    </Tap>
  );
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: 6 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, paddingVertical: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  trail: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 40 },
  empty: { paddingVertical: 16 },
});
