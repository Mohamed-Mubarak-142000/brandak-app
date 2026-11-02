import * as StoreReview from 'expo-store-review';

import { PREF, prefs } from './storage';

/**
 * Asks for an App Store / Play rating right after a customer gives a product they received 4+ stars, i.e. at
 * a happy moment. At most once every 120 days; the OS may still decide not to show it.
 */
export async function maybeAskForAppReview(rating: number) {
  if (rating < 4) return;
  const last = prefs.get<number>(PREF.appReviewAskedAt, 0);
  if (Date.now() - last < 120 * 86_400_000) return;
  try {
    if (!(await StoreReview.hasAction())) return;
    prefs.set(PREF.appReviewAskedAt, Date.now());
    // Let the "thanks" state show first.
    setTimeout(() => void StoreReview.requestReview().catch(() => undefined), 1200);
  } catch {
    // Best-effort.
  }
}
