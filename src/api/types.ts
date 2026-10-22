/**
 * Response shapes (the `data` of the envelope). Request bodies are typed from the generated
 * OpenAPI schema (`schema.d.ts`); responses are described here because the API returns service
 * views Swagger doesn't model. Mapped views use `id`; raw documents use `_id`.
 */

type ISODate = string;

export type OrderStatus = 'AWAITING_CONFIRMATION' | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUSED';
export type BrandStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
/** Kind of business behind a store. Labels and icons live in features/catalog/store-types.ts. */
export type StoreType = 'BRAND' | 'SHOWROOM' | 'WAREHOUSE' | 'SHOP';
export type BillingPeriod = 'MONTHLY' | 'YEARLY';
export type PaymentStatus = 'AWAITING_PROOF' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type UploadPurpose = 'PRODUCT_IMAGE' | 'BRAND_LOGO' | 'BRAND_COVER' | 'PAYMENT_PROOF' | 'REVIEW_IMAGE' | 'CLAIM_IMAGE';
export type ReportTarget = 'REVIEW' | 'PRODUCT' | 'BRAND';
export type ReportReason = 'SPAM' | 'OFFENSIVE' | 'FAKE' | 'PROHIBITED_PRODUCT' | 'FRAUD' | 'OTHER';

// ---------- Users ----------
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: ('CUSTOMER' | 'SUPER_ADMIN')[];
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: ISODate;
}
export interface Me extends PublicUser {
  brand: { id: string; role: 'OWNER' } | null;
}
export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

// ---------- Catalog ----------
export interface Category {
  _id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  parentId: string | null;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}
export interface Governorate {
  code: string;
  ar: string;
  en: string;
}
export interface ShippingZone {
  governorate: string;
  fee: number;
}
export interface PublicBrand {
  id: string;
  name: string;
  slug: string;
  storeType: StoreType;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
  categoryIds: string[];
  contact: { phone?: string; email?: string; whatsapp?: string };
  /** Missing on brands created before social links existed. */
  socialLinks?: { instagram?: string; facebook?: string; tiktok?: string; website?: string };
  shipping: {
    zones: ShippingZone[];
    defaultFee: number | null;
    freeShippingThreshold: number | null;
    minOrderAmount: number;
    processingDays: number;
    shippingPolicy: string;
    returnPolicy: string;
    /** Days after delivery to ask for a return; 0 = no returns. Missing on old API versions. */
    returnDays?: number;
    /** Collect from the store; missing on old API versions. */
    pickup?: { enabled: boolean; address?: string; governorate?: string | null; hours?: string; mapUrl?: string | null };
    allowResellers?: boolean;
    acceptsOrders: boolean;
  };
  ratingAvg: number;
  ratingCount: number;
}
export interface BrandMini {
  id: string;
  name?: string;
  slug?: string;
  logoUrl?: string | null;
}
/** A running sale on a product card; price is already the sale price. */
export interface ActiveSale {
  percent: number;
  endsAt: ISODate;
  campaignId: string | null;
}
export interface ProductCard {
  id: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  sale?: ActiveSale | null;
  imageUrl: string | null;
  inStock: boolean;
  ratingAvg: number;
  ratingCount: number;
  brand: BrandMini;
  wholesale?: Wholesale | null;
  /** Paid placement (shown with a "مُموَّل" tag). */
  sponsored?: boolean;
  adId?: string;
}
export interface Variant {
  id: string;
  size: string | null;
  color: string | null;
  price: number;
  inStock: boolean;
  available: number;
}
export interface ProductDetail extends ProductCard {
  description: string;
  images: string[];
  /** Same order as images: the colour each photo shows; null = every colour. Missing on old API versions. */
  imageColors?: (string | null)[];
  categoryId: string;
  tags: string[];
  variants: Variant[];
}
export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  images?: string[];
  reply?: { text: string; at: ISODate } | null;
  verifiedPurchase: true;
  createdAt: ISODate;
}
export interface BrandReview extends Review {
  productTitle: string;
}
export interface MyReview extends Review {
  status: 'VISIBLE' | 'HIDDEN';
}
export interface WishlistItem {
  productId: string;
  addedAt: ISODate;
  available: boolean;
  product: ProductCard | null;
}

// ---------- Cart & checkout ----------
export interface CartBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}
export interface CartSummary {
  brand: CartBrand;
  itemsCount: number;
  updatedAt: ISODate;
}
/** BELOW_MIN_QTY: a wholesale product with fewer pieces than its minimum (all sizes together). */
export type LineIssue = 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'BELOW_MIN_QTY';
export interface PricedLine {
  itemId: string;
  productId: string;
  variantId: string;
  title: string;
  imageUrl: string | null;
  size: string | null;
  color: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  available: number;
  /** Wholesale minimum for the product; missing on old API versions. */
  minQty?: number;
  issue: LineIssue | null;
}
export interface CartView {
  brand: CartBrand;
  acceptingOrders: boolean;
  items: PricedLine[];
  subtotal: number;
  hasIssues: boolean;
}
export interface Quote {
  items: PricedLine[];
  subtotal: number;
  shippingFee: number;
  discountTotal: number;
  grandTotal: number;
  coupon?: { code: string; discount: number } | null;
  currency: 'EGP';
  paymentMethods: ['COD'];
  points?: { balance: number; usable: number; usableDiscount: number; used: number; discount: number } | null;
  resale?: { margin: number; storeSubtotal: number } | null;
  fulfillment?: 'DELIVERY' | 'PICKUP';
}

// ---------- Orders ----------
export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  governorate: string;
  governorateName: string;
  city: string;
  area: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  landmark: string;
  location: { lat: number; lng: number } | null;
  isDefault: boolean;
}
export interface OrderSummary {
  id: string;
  orderNumber: string;
  brand: { id: string; name: string; slug: string; phone?: string };
  status: OrderStatus;
  statusLabelAr: string;
  itemsCount: number;
  grandTotal: number;
  currency: string;
  paymentMethod: 'COD';
  paymentStatus: 'UNPAID' | 'PAID';
  createdAt: ISODate;
  customer?: { name: string; phone: string };
  previewImageUrl?: string | null;
}
export interface OrderItem {
  productId: string;
  variantId: string;
  title: string;
  imageUrl?: string;
  size?: string;
  color?: string;
  sku?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}
export interface OrderDetail extends Omit<OrderSummary, 'previewImageUrl'> {
  items: OrderItem[];
  /** null for orders collected from the store. */
  address: Address | null;
  fulfillment?: 'DELIVERY' | 'PICKUP';
  points?: { used: number; discount: number; earned: number } | null;
  gift?: { message: string; hidePrices: boolean } | null;
  resale?: { margin: number } | null;
  pickup?: { address: string; governorate: string | null; hours: string; mapUrl: string } | null;
  subtotal: number;
  shippingFee: number;
  discountTotal: number;
  notes: string;
  cancelReason: string | null;
  deliveredAt: ISODate | null;
  history: { status: OrderStatus; at: ISODate; actor: 'CUSTOMER' | 'BRAND' | 'ADMIN' | 'SYSTEM'; note: string | null }[];
  allowedNextStatuses: OrderStatus[];
  coupon?: { code: string; discount: number; fundedBy: 'BRAND' | 'PLATFORM' } | null;
  shipment?: { carrier: string; trackingNumber: string; trackingUrl: string | null; shippedAt: ISODate } | null;
  /** Store view only: the platform's 5% once delivered. */
  commission?: { rate: number; base: number; amount: number } | null;
  /** Store view only: the customer's delivery record across all stores. */
  customerTrust?: CustomerTrust;
}

export interface CustomerTrust {
  delivered: number;
  refused: number;
  level: 'NEW' | 'GOOD' | 'RISKY';
}

// ---------- Promotions ----------
export interface Campaign {
  _id: string;
  nameAr: string;
  slug: string;
  descriptionAr: string;
  startsAt: ISODate;
  endsAt: ISODate;
  minPercent: number;
  color: string;
}
export interface Coupon {
  _id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  maxDiscount: number | null;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number;
  startsAt: ISODate;
  endsAt: ISODate;
  isActive: boolean;
}

// ---------- Commission ----------
export interface CommissionTerms {
  commissionRate: number;
  settlementDays: number;
  maxUnpaidBalance: number;
}
export interface CommissionStatus extends CommissionTerms {
  balance: number;
  dueSince: ISODate | null;
  dueBy: ISODate | null;
  blocked: boolean;
  pendingSettlement: { id: string; amount: number; createdAt: ISODate } | null;
}
export interface LedgerEntry {
  _id: string;
  type: 'COMMISSION' | 'REVERSAL' | 'PAYMENT' | 'ADJUSTMENT' | 'RESELLER_MARGIN';
  amount: number;
  orderId?: string;
  orderNumber?: string;
  rate?: number;
  base?: number;
  note?: string;
  createdAt: ISODate;
}
export interface Settlement {
  _id: string;
  amount: number;
  transactionReference: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: ISODate;
}
export interface BlockedCustomer {
  id: string;
  customer: { name: string; phone: string };
  note: string;
  createdAt: ISODate;
}

// ---------- Notifications ----------
export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_STATUS_CHANGED'
  | 'BRAND_APPROVED'
  | 'BRAND_REJECTED'
  | 'BRAND_SUSPENDED'
  | 'BRAND_REINSTATED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'SUBSCRIPTION_EXPIRING'
  | 'SUBSCRIPTION_EXPIRED'
  | (string & {});
export interface AppNotification {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  readAt?: ISODate;
  createdAt: ISODate;
}

// ---------- Seller ----------
/** maxOrdersPerMonth null = unlimited; older subscriptions may lack the newer limits. */
export interface PlanLimits {
  maxActiveProducts: number;
  maxOrdersPerMonth?: number | null;
  maxImagesPerProduct?: number;
}
export interface Plan {
  _id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  priceMonthly: number;
  priceYearly: number;
  limits: PlanLimits;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}
export interface PaymentInstructions {
  method: 'INSTAPAY_MANUAL';
  amount: number;
  currency: 'EGP';
  receiver: string;
  receiverName: string;
  stepsAr: string[];
}
export interface PaymentView {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  method: 'INSTAPAY_MANUAL';
  status: PaymentStatus;
  transactionReference: string | null;
  submittedAt: ISODate | null;
  reviewedAt: ISODate | null;
  rejectionReason: string | null;
}
export interface SubscriptionDoc {
  _id: string;
  brandId: string;
  planId: string;
  planSnapshot: {
    code: string;
    nameAr: string;
    nameEn: string;
    price: number;
    durationDays: number;
    limits: PlanLimits;
  };
  billingPeriod: BillingPeriod;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startsAt?: ISODate;
  endsAt?: ISODate;
  createdAt: ISODate;
}
export type SubWithPayment = SubscriptionDoc & { payment: PaymentView | null };
export interface MySubscriptions {
  paidUntil: ISODate | null;
  current: SubWithPayment | null;
  pending: (SubWithPayment & { instructions: PaymentInstructions }) | null;
  history: SubWithPayment[];
}
/** A free plan comes back already ACTIVE with no payment and no instructions. */
export interface SubscriptionRequestResult {
  subscription: SubscriptionDoc;
  payment: PaymentView | null;
  instructions: PaymentInstructions | null;
}
export interface BrandSettings {
  shippingZones: ShippingZone[];
  defaultShippingFee: number | null;
  freeShippingThreshold: number | null;
  minOrderAmount: number;
  processingDays: number;
  shippingPolicy: string;
  returnPolicy: string;
  returnDays?: number;
  pickup?: { enabled: boolean; address: string; governorate: string | null; hours: string; mapUrl: string };
  allowResellers?: boolean;
  acceptsOrders: boolean;
}
export interface OwnerBrand {
  id: string;
  name: string;
  slug: string;
  storeType: StoreType;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
  categoryIds: string[];
  status: BrandStatus;
  statusReason: string | null;
  contact: PublicBrand['contact'];
  socialLinks?: PublicBrand['socialLinks'];
  settings: BrandSettings;
  subscriptionEndsAt: ISODate | null;
  isVisible: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: ISODate;
}
export interface Wholesale {
  minQty: number;
  tiers: { minQty: number; price: number }[];
}
export interface ProductDraft {
  title: string;
  description: string;
  categoryId: string | null;
  colors: string[];
  sizes: string[];
  tags: string[];
  /** Rough market price in EGP; null when the model couldn't tell. Missing on old API versions. */
  suggestedPrice?: number | null;
}
export interface BrandProduct {
  _id: string;
  wholesale?: Wholesale | null;
  categoryId: string;
  title: string;
  description: string;
  images: { fileId: string; url: string; color?: string | null }[];
  price: number;
  compareAtPrice: number | null;
  sale?: { percent: number; startsAt: ISODate; endsAt: ISODate; campaignId: string | null } | null;
  variants: { _id: string; sku?: string; size?: string; color?: string; price: number | null; stock: number }[];
  status: ProductStatus;
  tags: string[];
  totalStock: number;
  soldCount: number;
  ratingAvg: number;
  ratingCount: number;
  publishedAt?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}
export interface BrandCustomer {
  customerId: string;
  name: string;
  phone: string;
  ordersCount: number;
  deliveredCount: number;
  totalSpent: number;
  lastOrderAt: ISODate;
}
export interface BrandOverview {
  /** What the store owes the platform (commission model). */
  commission?: { rate: number; balance: number; dueBy: ISODate | null; blocked: boolean; pendingSettlement: boolean };
  range: { from: ISODate; to: ISODate };
  orders: { count: number; changePct: number | null; pendingNow: number; byStatus: Record<OrderStatus, number> };
  salesValue: number;
  salesChangePct: number | null;
  deliveredRevenue: number;
  averageOrderValue: number;
  daily: { date: string; orders: number; sales: number }[];
  topProducts: { productId: string; title: string; imageUrl: string | null; quantity: number; revenue: number }[];
  lowStock: {
    productId: string;
    title: string;
    imageUrl: string | null;
    variants: { id: string; size: string | null; color: string | null; stock: number }[];
  }[];
  plan: {
    name: string;
    endsAt: ISODate;
    activeProducts: number;
    maxActiveProducts: number;
    isFree?: boolean;
    maxOrdersPerMonth?: number | null;
    maxImagesPerProduct?: number;
    ordersThisMonth?: number;
  } | null;
}
export interface UploadResult {
  id: string;
  purpose: UploadPurpose;
  url: string | null;
  mime: string;
  size: number;
}

// ---------- Questions ----------
export interface Question {
  id: string;
  productId: string;
  userName: string;
  text: string;
  answer: string | null;
  answeredAt: ISODate | null;
  /** Asked by the signed-in viewer (shown even before it is answered). */
  mine: boolean;
  createdAt: ISODate;
}
export interface BrandQuestion extends Question {
  productTitle: string;
}

// ---------- Returns ----------
export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED' | 'CANCELLED';
export type ReturnReason = 'WRONG_SIZE' | 'DAMAGED' | 'NOT_AS_DESCRIBED' | 'WRONG_ITEM' | 'CHANGED_MIND' | 'OTHER';
export interface ReturnItem {
  productId: string;
  variantId: string;
  title: string;
  imageUrl?: string;
  size?: string;
  color?: string;
  unitPrice: number;
  quantity: number;
}
export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  brandId: string;
  customerName: string;
  items: ReturnItem[];
  reason: ReturnReason;
  note: string;
  images: string[];
  refundAmount: number;
  status: ReturnStatus;
  history: { status: ReturnStatus; at: ISODate; actor: 'CUSTOMER' | 'BRAND' | 'ADMIN'; note?: string }[];
  commissionReversed: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}
export interface ReturnEligibility {
  returnDays: number;
  until: ISODate | null;
  open: boolean;
  items: { variantId: string; title: string; imageUrl?: string; size?: string; color?: string; unitPrice: number; returnable: number }[];
}

// ---------- Support ----------
export type TicketType = 'NOT_RECEIVED' | 'NOT_AS_DESCRIBED' | 'ORDER_PROBLEM' | 'PAYMENT' | 'ACCOUNT' | 'OTHER';
export type TicketStatus = 'WAITING_STORE' | 'OPEN' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
export interface TicketMessage {
  id?: string;
  author: 'CUSTOMER' | 'BRAND' | 'ADMIN';
  text: string;
  images: string[];
  at: ISODate;
}
export interface Ticket {
  id: string;
  number: string;
  userName: string;
  type: TicketType;
  subject: string;
  orderId: string | null;
  orderNumber: string | null;
  brandId: string | null;
  brandName: string | null;
  protection: boolean;
  storeDeadline: ISODate | null;
  status: TicketStatus;
  escalatedAt: ISODate | null;
  resolution: { outcome: 'CUSTOMER' | 'STORE' | 'NEUTRAL'; note: string; at: ISODate } | null;
  /** Only on the detail endpoint. */
  messages?: TicketMessage[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ---------- Ads ----------
export type AdPlacement = 'SEARCH_TOP' | 'CATEGORY_TOP' | 'HOME_BANNER';
export interface AdPrice {
  placement: AdPlacement;
  name: string;
  weekPrice: number;
  slots: number;
}
export interface Ad {
  id: string;
  productId: string;
  productTitle: string;
  placement: AdPlacement;
  placementName: string;
  weeks: number;
  price: number;
  transactionReference: string;
  status: 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'EXPIRED';
  startsAt: ISODate | null;
  endsAt: ISODate | null;
  rejectReason: string | null;
  impressions: number;
  clicks: number;
  createdAt: ISODate;
}
