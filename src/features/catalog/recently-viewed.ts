import { create } from 'zustand';

import type { ProductCard } from '@/api/types';
import { PREF, prefs } from '@/lib/storage';

const MAX = 20;

/**
 * Products opened on this device, newest first. Kept as card snapshots so the rails render
 * without a request; the product page always loads fresh data when one is opened.
 */
export const useRecentlyViewed = create<{ items: ProductCard[]; add: (p: ProductCard) => void; clear: () => void }>((set, get) => ({
  // Sales saved with a snapshot may have ended since.
  items: prefs.get<ProductCard[]>(PREF.recentlyViewed, []).map((p) => (p.sale && new Date(p.sale.endsAt).getTime() < Date.now() ? { ...p, sale: null } : p)),
  add: (p) => {
    // A snapshot is never an ad: no «إعلان» styling and no click counted when reopened.
    const card: ProductCard = {
      id: p.id,
      title: p.title,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      sale: p.sale,
      imageUrl: p.imageUrl,
      inStock: p.inStock,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      brand: p.brand,
      wholesale: p.wholesale,
    };
    const items = [card, ...get().items.filter((x) => x.id !== p.id)].slice(0, MAX);
    prefs.set(PREF.recentlyViewed, items);
    set({ items });
  },
  clear: () => {
    prefs.set(PREF.recentlyViewed, []);
    set({ items: [] });
  },
}));
