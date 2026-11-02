import { BadgeCheck, ShoppingBasket, Store, Warehouse, type LucideIcon } from 'lucide-react-native';

import type { StoreType } from '@/api/types';

/**
 * The one place that describes each kind of store. Adding a type = add it to the API enum
 * (`StoreType` in the backend) and one entry here; every picker, badge and filter reads this list.
 */
export interface StoreTypeInfo {
  type: StoreType;
  /** Singular, e.g. "معرض". */
  label: string;
  /** Plural for filters, e.g. "معارض". */
  plural: string;
  /** "اسم المعرض" etc. — used in forms. */
  nameLabel: string;
  description: string;
  /** How this kind of store lists products, shown when it's picked. */
  system: string[];
  icon: LucideIcon;
}

export const STORE_TYPES: StoreTypeInfo[] = [
  {
    type: 'BRAND',
    label: 'براند',
    plural: 'براندات',
    nameLabel: 'اسم البراند',
    description: 'علامة تجارية بتصمّم أو بتصنّع منتجاتها',
    system: ['كل منتج بمقاساته وألوانه، وكمية لكل مقاس ولون', 'صور لكل لون، والعميل يشوف صور اللون اللي اختاره', 'الخامة والقصّة والموسم عشان العميل يفلتر بيها'],
    icon: BadgeCheck,
  },
  {
    type: 'SHOWROOM',
    label: 'معرض',
    plural: 'معارض',
    nameLabel: 'اسم المعرض',
    description: 'معرض بيعرض ويبيع تشكيلة منتجات',
    system: ['كل موديل بمواصفاته: الماركة والموديل والسعة', 'الحالة (جديد، كسر زيرو، مستعمل) والضمان', 'التوصيل والتركيب لو متاحين'],
    icon: Store,
  },
  {
    type: 'WAREHOUSE',
    label: 'مخزن',
    plural: 'مخازن',
    nameLabel: 'اسم المخزن',
    description: 'بيع بالجملة أو بكميات من المخزن',
    system: ['جملة وقطاعي: سعر للقطعة وأسعار أقل كل ما الكمية تزيد', 'البيع بالكرتونة أو الدستة أو الشيكارة وعدد القطع فيها', 'أقل كمية للطلب لو حابب'],
    icon: Warehouse,
  },
  {
    type: 'SHOP',
    label: 'محل',
    plural: 'محلات',
    nameLabel: 'اسم المحل',
    description: 'محل تجزئة بيبيع للمستهلك مباشرة',
    system: ['منتجات بالقطعة أو الوزن أو العلبة', 'الماركة والحجم والصلاحية لكل منتج', 'الكمية المتاحة بتتحدث مع كل طلب'],
    icon: ShoppingBasket,
  },
];

export const storeTypeInfo = (type?: StoreType | null) => STORE_TYPES.find((s) => s.type === type) ?? STORE_TYPES[0];
