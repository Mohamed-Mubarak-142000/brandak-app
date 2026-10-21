import type { IllustrationName } from '@/ui';

export interface Slide {
  art: IllustrationName;
  eyebrow: string;
  title: string;
  body: string;
}

export const SLIDES: Slide[] = [
  {
    art: 'onboarding-discover',
    eyebrow: 'أهلاً بيك في فاترينة',
    title: 'معارض ومحلات ومخازن\nوبراندات في مكان واحد',
    body: 'اكتشف منتجات من معارض ومخازن ومحلات وبراندات محلية، وقارن واختار اللي يناسبك.',
  },
  {
    art: 'onboarding-shop',
    eyebrow: 'تسوّق براحتك',
    title: 'سلة لكل متجر،\nوتتبّع لحد بابك',
    body: 'اطلب من أكتر من متجر في نفس الوقت، وتابع كل طلب خطوة بخطوة من التأكيد للتوصيل.',
  },
  {
    art: 'onboarding-delivery',
    eyebrow: 'أمان من غير قلق',
    title: 'ادفع كاش\nلما الطلب يوصلك',
    body: 'مفيش دفع مقدّم. والتقييمات اللي بتشوفها من ناس اشترت واستلمت فعلاً.',
  },
  {
    art: 'onboarding-sell',
    eyebrow: 'عندك معرض أو مخزن أو محل أو براند؟',
    title: 'افتح متجرك\nوابدأ تبيع النهارده',
    body: 'افتح ببلاش وادفع 5% بس لما تبيع. ولوحة تحكم كاملة من موبايلك: منتجات، طلبات، وإحصائيات.',
  },
];
