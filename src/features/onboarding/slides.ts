import type { IllustrationName } from '@/ui';

export interface Slide {
  art: IllustrationName;
  eyebrow: string;
  title: string;
  body: string;
}

export const SLIDES: Slide[] = [
  {
    art: 'brands',
    eyebrow: 'أهلاً بيك في براندك',
    title: 'كل البراندات المصرية\nفي مكان واحد',
    body: 'اكتشف براندات محلية أصلية في الموضة والعناية والبيت — كلها متراجعة ومعتمدة من فريقنا.',
  },
  {
    art: 'cart',
    eyebrow: 'تسوّق براحتك',
    title: 'سلة لكل براند،\nوتتبّع لحد بابك',
    body: 'اطلب من أكتر من براند في نفس الوقت، وتابع كل طلب خطوة بخطوة من التأكيد للتوصيل.',
  },
  {
    art: 'trust',
    eyebrow: 'أمان من غير قلق',
    title: 'ادفع كاش\nلما الطلب يوصلك',
    body: 'مفيش دفع مقدّم. والتقييمات اللي بتشوفها من ناس اشترت واستلمت فعلاً.',
  },
  {
    art: 'store',
    eyebrow: 'عندك براند؟',
    title: 'افتح متجرك\nوابدأ تبيع النهارده',
    body: 'اشتراك بسيط بـ InstaPay ولوحة تحكم كاملة من موبايلك: منتجات، طلبات، وإحصائيات.',
  },
];
