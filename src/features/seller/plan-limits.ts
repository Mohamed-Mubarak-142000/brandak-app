import type { PlanLimits } from '@/api/types';

/** "10 منتجات · 30 طلب/شهر · 3 صور للمنتج" — the same wording everywhere a plan is shown. */
export function planLimitsText(l: PlanLimits) {
  const orders = l.maxOrdersPerMonth == null ? 'طلبات بلا حد' : `${l.maxOrdersPerMonth} طلب/شهر`;
  return [`${l.maxActiveProducts} منتج منشور`, orders, `${l.maxImagesPerProduct ?? 10} صور للمنتج`].join(' · ');
}
