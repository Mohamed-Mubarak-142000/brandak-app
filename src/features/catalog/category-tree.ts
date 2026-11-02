import type { Category } from '@/api/types';

/**
 * Helpers over the flat category list the API returns. The tree is section › category ›
 * sub-category; products are filed at the ends ("leaves").
 */
export function categoryTree(all: Category[]) {
  const live = all.filter((c) => c.isActive);
  const byId = new Map(live.map((c) => [c._id, c]));
  const children = new Map<string | null, Category[]>();
  for (const c of live) {
    const key = c.parentId && byId.has(c.parentId) ? c.parentId : null;
    children.set(key, [...(children.get(key) ?? []), c]);
  }
  for (const list of children.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.nameAr.localeCompare(b.nameAr, 'ar'));

  /** Parents from the top down (falls back to walking parentId on old API versions). */
  const ancestors = (id: string): Category[] => {
    const out: Category[] = [];
    let c = byId.get(id);
    while (c?.parentId && out.length < 5) {
      const p = byId.get(c.parentId);
      if (!p) break;
      out.unshift(p);
      c = p;
    }
    return out;
  };
  const isLeaf = (id: string) => !children.get(id)?.length;
  const path = (id: string) => [...ancestors(id), byId.get(id)].filter(Boolean).map((c) => c!.nameAr).join(' › ');
  /** Every category under `id`, at any depth. */
  const descendants = (id: string): Category[] => (children.get(id) ?? []).flatMap((c) => [c, ...descendants(c._id)]);
  /** Leaves under any of `roots` (or anywhere when roots is empty), with their path. */
  const leavesUnder = (roots: string[]) => {
    const pool = roots.length ? roots.flatMap((r) => (byId.has(r) ? [byId.get(r)!, ...descendants(r)] : [])) : live;
    return [...new Map(pool.filter((c) => isLeaf(c._id)).map((c) => [c._id, c])).values()];
  };
  return { byId, children: (id: string | null) => children.get(id) ?? [], ancestors, isLeaf, path, descendants, leavesUnder };
}

export type CategoryTree = ReturnType<typeof categoryTree>;

/** Top-level sections for a store to pick, each listing a few of what's inside. */
export function sectionOptions(all: Category[]) {
  const tree = categoryTree(all);
  return tree.children(null).map((c) => {
    const inside = tree.children(c._id);
    return {
      value: c._id,
      label: c.nameAr,
      description: inside.length ? inside.slice(0, 5).map((x) => x.nameAr).join('، ') + (inside.length > 5 ? ' وغيرهم' : '') : undefined,
    };
  });
}
