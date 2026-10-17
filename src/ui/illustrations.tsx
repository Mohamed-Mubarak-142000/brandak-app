import { Image } from 'expo-image';

/** Bundled transparent artwork for onboarding and contextual feedback. */
const artwork = {
  'onboarding-discover': require('../../assets/illustrations/onboarding-discover.png'),
  'onboarding-shop': require('../../assets/illustrations/onboarding-shop.png'),
  'onboarding-delivery': require('../../assets/illustrations/onboarding-delivery.png'),
  'onboarding-sell': require('../../assets/illustrations/onboarding-sell.png'),
  brands: require('../../assets/illustrations/brands.png'),
  cart: require('../../assets/illustrations/cart.png'),
  trust: require('../../assets/illustrations/trust.png'),
  store: require('../../assets/illustrations/store.png'),
  empty: require('../../assets/illustrations/empty.png'),
  error: require('../../assets/illustrations/error.png'),
  offline: require('../../assets/illustrations/offline.png'),
  bag: require('../../assets/illustrations/bag.png'),
  heart: require('../../assets/illustrations/heart.png'),
  search: require('../../assets/illustrations/search.png'),
  box: require('../../assets/illustrations/box.png'),
  pending: require('../../assets/illustrations/pending.png'),
  success: require('../../assets/illustrations/success.png'),
  bell: require('../../assets/illustrations/bell.png'),
  address: require('../../assets/illustrations/address.png'),
} as const;

export type IllustrationName = keyof typeof artwork;

export function Illustration({ name, size = 220 }: { name: IllustrationName; size?: number }) {
  return (
    <Image
      source={artwork[name]}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
