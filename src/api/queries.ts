import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/auth/session';
import { api, type Page, type Query } from './client';
import type {
  Address,
  AppNotification,
  BrandCustomer,
  BrandOverview,
  BrandProduct,
  CartSummary,
  CartView,
  Category,
  Governorate,
  MyReview,
  MySubscriptions,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  OwnerBrand,
  PaymentInstructions,
  Plan,
  ProductCard,
  ProductDetail,
  PublicBrand,
  StoreType,
  Review,
  WishlistItem, CommissionStatus, CommissionTerms, LedgerEntry, Campaign, Coupon,
  Ad, AdPrice, BrandQuestion, BrandReview, Question, ReturnEligibility, ReturnRequest, ReturnStatus, Ticket } from './types';

export const qk = {
  categories: ['categories'] as const,
  governorates: ['governorates'] as const,
  brands: (q: Query) => ['brands', q] as const,
  brand: (slug: string) => ['brand', slug] as const,
  products: (q: Query) => ['products', q] as const,
  product: (id: string) => ['product', id] as const,
  reviews: (id: string) => ['reviews', id] as const,
  myReviews: ['reviews', 'me'] as const,
  wishlist: ['wishlist'] as const,
  wishlistIds: ['wishlist', 'ids'] as const,
  carts: ['carts'] as const,
  cart: (brandId: string) => ['cart', brandId] as const,
  orders: (status?: string) => ['orders', status ?? 'all'] as const,
  order: (id: string) => ['order', id] as const,
  addresses: ['addresses'] as const,
  notifications: ['notifications'] as const,
  // seller
  myBrand: ['seller', 'brand'] as const,
  plans: ['plans'] as const,
  instructions: ['payment-instructions'] as const,
  mySubs: ['seller', 'subscriptions'] as const,
  commission: ['seller', 'commission'] as const,
  commissionLedger: ['seller', 'commission', 'ledger'] as const,
  terms: ['platform', 'terms'] as const,
  overview: (days: number) => ['seller', 'overview', days] as const,
  sellerProducts: (q: Query) => ['seller', 'products', q] as const,
  sellerProduct: (id: string) => ['seller', 'product', id] as const,
  sellerOrders: (q: Query) => ['seller', 'orders', q] as const,
  sellerOrder: (id: string) => ['seller', 'order', id] as const,
  customers: ['seller', 'customers'] as const,
  questions: (productId: string) => ['questions', productId] as const,
  sellerQuestions: (unanswered: boolean) => ['seller', 'questions', unanswered] as const,
  sellerReviews: (unanswered: boolean) => ['seller', 'reviews', unanswered] as const,
  returns: ['returns'] as const,
  returnOne: (id: string) => ['returns', 'one', id] as const,
  eligibility: (orderId: string) => ['returns', 'eligibility', orderId] as const,
  sellerReturns: (status?: string) => ['seller', 'returns', status ?? 'all'] as const,
  sellerReturn: (id: string) => ['seller', 'returns', 'one', id] as const,
  tickets: ['tickets'] as const,
  ticket: (id: string) => ['tickets', 'one', id] as const,
  sellerTickets: ['seller', 'tickets'] as const,
  sellerTicket: (id: string) => ['seller', 'tickets', 'one', id] as const,
  adPrices: ['ads', 'prices'] as const,
  sellerAds: ['seller', 'ads'] as const,
  featured: ['products', 'featured'] as const,
};

const useAuthed = () => useSession((s) => s.status === 'authed');

/** Infinite page list with the API's page/limit/total meta. */
function usePaged<T>(key: readonly unknown[], path: string, query: Query = {}, enabled = true, limit = 20) {
  return useInfiniteQuery({
    queryKey: key,
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.page<T>(path, { ...query, page: pageParam, limit }),
    getNextPageParam: (last: Page<T>) => (last.meta.page * last.meta.limit < last.meta.total ? last.meta.page + 1 : undefined),
  });
}

export const flatPages = <T,>(data?: { pages: Page<T>[] }) => data?.pages.flatMap((p) => p.items) ?? [];

// ---------- Catalog ----------
/** Active categories; pass a store type to get only the ones offered to it (for store forms). */
export const useCategories = (storeType?: StoreType | null) =>
  useQuery({
    queryKey: storeType ? [...qk.categories, storeType] : qk.categories,
    queryFn: () => api.get<Category[]>('/categories', storeType ? { storeType } : undefined),
    staleTime: 60 * 60_000,
  });
export const useGovernorates = () =>
  useQuery({ queryKey: qk.governorates, queryFn: () => api.get<Governorate[]>('/governorates'), staleTime: Infinity });

export const useBrands = (q: Query = {}, limit = 20, enabled = true) =>
  usePaged<PublicBrand>(qk.brands({ ...q, limit }), '/brands', q, enabled, limit);
export const useBrand = (slug: string) =>
  useQuery({ queryKey: qk.brand(slug), queryFn: () => api.get<PublicBrand>(`/brands/${slug}`), enabled: !!slug });

export const useProducts = (q: Query = {}, limit = 20, enabled = true) =>
  usePaged<ProductCard>(qk.products({ ...q, limit }), q.brandSlug ? `/brands/${q.brandSlug}/products` : '/products', { ...q, brandSlug: undefined }, enabled, limit);
/** Running and upcoming seasons (White Friday, Ramadan...). */
export const useCampaigns = () => useQuery({ queryKey: ['campaigns'], queryFn: () => api.get<Campaign[]>('/campaigns'), staleTime: 5 * 60_000 });
export const useSellerCoupons = () => useQuery({ queryKey: ['seller', 'coupons'], queryFn: () => api.get<Coupon[]>('/brand/coupons') });
export const useProduct = (id: string) => useQuery({ queryKey: qk.product(id), queryFn: () => api.get<ProductDetail>(`/products/${id}`) });
export const useReviews = (id: string) => usePaged<Review>(qk.reviews(id), `/products/${id}/reviews`, {}, true, 10);
export const useMyReviews = () => usePaged<MyReview>(qk.myReviews, '/reviews/me', {}, useAuthed());

// ---------- Wishlist ----------
export const useWishlistIds = () => {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.wishlistIds, queryFn: () => api.get<string[]>('/wishlists/me/ids'), enabled: authed });
};
export const useWishlist = () => usePaged<WishlistItem>(qk.wishlist, '/wishlists/me', {}, useAuthed());

export function useToggleWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, on }: { productId: string; on: boolean }) =>
      on ? api.post('/wishlists/me/items', { productId }) : api.del(`/wishlists/me/items/${productId}`),
    onMutate: async ({ productId, on }) => {
      await qc.cancelQueries({ queryKey: qk.wishlistIds });
      const prev = qc.getQueryData<string[]>(qk.wishlistIds);
      qc.setQueryData<string[]>(qk.wishlistIds, (ids = []) => (on ? [...new Set([...ids, productId])] : ids.filter((i) => i !== productId)));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(qk.wishlistIds, ctx?.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.wishlistIds });
      qc.invalidateQueries({ queryKey: qk.wishlist });
    },
  });
}

// ---------- Cart ----------
export const useCarts = () => {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.carts, queryFn: () => api.get<CartSummary[]>('/carts'), enabled: authed });
};
export const useCart = (brandId: string, enabled = true) =>
  useQuery({ queryKey: qk.cart(brandId), queryFn: () => api.get<CartView>(`/carts/${brandId}`), enabled: useAuthed() && enabled });

export function useCartMutations(brandId: string) {
  const qc = useQueryClient();
  const settle = (cart: CartView | null) => {
    if (cart) qc.setQueryData(qk.cart(brandId), cart);
    else qc.removeQueries({ queryKey: qk.cart(brandId) });
    qc.invalidateQueries({ queryKey: qk.carts });
  };
  return {
    add: useMutation({
      mutationFn: (body: { productId: string; variantId: string; quantity: number }) => api.post<CartView>(`/carts/${brandId}/items`, body),
      onSuccess: settle,
    }),
    setQty: useMutation({
      mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
        api.patch<CartView>(`/carts/${brandId}/items/${itemId}`, { quantity }),
      onSuccess: settle,
    }),
    remove: useMutation({
      mutationFn: (itemId: string) => api.del<CartView>(`/carts/${brandId}/items/${itemId}`),
      onSuccess: settle,
    }),
    clear: useMutation({ mutationFn: () => api.del(`/carts/${brandId}`), onSuccess: () => settle(null) }),
  };
}

// ---------- Addresses ----------
export const useAddresses = () => {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.addresses, queryFn: () => api.get<Address[]>('/addresses/me'), enabled: authed });
};
export type AddressInput = Omit<Address, 'id' | 'governorateName' | 'location'> & { location?: { lat: number; lng: number } };
export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<AddressInput> & { id?: string }) =>
      id ? api.patch<Address>(`/addresses/me/${id}`, body) : api.post<Address>('/addresses/me', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses }),
  });
}
export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.del(`/addresses/me/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses }) });
}

// ---------- Orders ----------
export const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'];
export const useOrders = (status?: OrderStatus) => usePaged<OrderSummary>(qk.orders(status), '/orders/me', { status }, useAuthed());
export const useOrder = (id: string) => useQuery({ queryKey: qk.order(id), queryFn: () => api.get<OrderDetail>(`/orders/me/${id}`) });

// ---------- Notifications ----------
export const useNotifications = () => usePaged<AppNotification>(qk.notifications, '/notifications/me', {}, useAuthed());
export function useUnreadCount() {
  const authed = useAuthed();
  return useQuery({
    queryKey: [...qk.notifications, 'unread'],
    queryFn: async () => (await api.page<AppNotification>('/notifications/me', { limit: 1 })).meta.unread ?? 0,
    enabled: authed,
    refetchInterval: 60_000,
  });
}

// ---------- Seller ----------
export const useMyBrand = (enabled = true) =>
  useQuery({ queryKey: qk.myBrand, queryFn: () => api.get<OwnerBrand>('/brands/me'), enabled: useAuthed() && enabled });
export const usePlans = () => useQuery({ queryKey: qk.plans, queryFn: () => api.get<Plan[]>('/subscription-plans'), staleTime: 10 * 60_000 });
export const useInstructions = () =>
  useQuery({ queryKey: qk.instructions, queryFn: () => api.get<PaymentInstructions>('/payment-instructions'), staleTime: 10 * 60_000 });
/** What the store owes the platform, and whether it is paused for not paying. */
export const useCommission = (enabled = true) =>
  useQuery({ queryKey: qk.commission, queryFn: () => api.get<CommissionStatus>('/brand/commissions'), enabled: useAuthed() && enabled });
export const useCommissionLedger = () =>
  useQuery({ queryKey: qk.commissionLedger, queryFn: () => api.page<LedgerEntry>('/brand/commissions/ledger', { limit: 50 }) });
export const usePlatformTerms = () =>
  useQuery({ queryKey: qk.terms, queryFn: () => api.get<CommissionTerms>('/platform/terms'), staleTime: 10 * 60_000 });
export const useMySubscriptions = () => useQuery({ queryKey: qk.mySubs, queryFn: () => api.get<MySubscriptions>('/brand/subscriptions/me') });
export function useOverview(days: number) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return useQuery({
    queryKey: qk.overview(days),
    queryFn: () => api.get<BrandOverview>('/brand/analytics/overview', { from: from.toISOString(), to: to.toISOString() }),
  });
}
export const useSellerProducts = (q: Query) => usePaged<BrandProduct>(qk.sellerProducts(q), '/brand/products', q);
export const useSellerProduct = (id?: string) =>
  useQuery({ queryKey: qk.sellerProduct(id ?? 'new'), queryFn: () => api.get<BrandProduct>(`/brand/products/${id}`), enabled: !!id });
export const useSellerOrders = (q: Query) => usePaged<OrderSummary>(qk.sellerOrders(q), '/brand/orders', q);
export const useSellerOrder = (id: string) => useQuery({ queryKey: qk.sellerOrder(id), queryFn: () => api.get<OrderDetail>(`/brand/orders/${id}`) });
export const useCustomers = () => usePaged<BrandCustomer>(qk.customers, '/brand/customers');

// ---------- Questions & reviews ----------
/** Answered questions, plus the viewer's own ones still waiting. */
export const useQuestions = (productId: string) => usePaged<Question>(qk.questions(productId), `/products/${productId}/questions`, {}, true, 10);
export const useSellerQuestions = (unanswered: boolean) =>
  usePaged<BrandQuestion>(qk.sellerQuestions(unanswered), '/brand/questions', unanswered ? { unanswered: true } : {});
export const useSellerReviews = (unanswered: boolean) =>
  usePaged<BrandReview>(qk.sellerReviews(unanswered), '/brand/reviews', unanswered ? { unanswered: true } : {});

// ---------- Returns ----------
export const useMyReturns = () => usePaged<ReturnRequest>(qk.returns, '/returns/me', {}, useAuthed());
export const useMyReturn = (id: string) => useQuery({ queryKey: qk.returnOne(id), queryFn: () => api.get<ReturnRequest>(`/returns/me/${id}`) });
export const useReturnEligibility = (orderId: string, enabled = true) =>
  useQuery({ queryKey: qk.eligibility(orderId), queryFn: () => api.get<ReturnEligibility>(`/orders/me/${orderId}/returns/eligibility`), enabled });
export const useSellerReturns = (status?: ReturnStatus) => usePaged<ReturnRequest>(qk.sellerReturns(status), '/brand/returns', { status });
export const useSellerReturn = (id: string) => useQuery({ queryKey: qk.sellerReturn(id), queryFn: () => api.get<ReturnRequest>(`/brand/returns/${id}`) });

// ---------- Support ----------
export const useMyTickets = () => usePaged<Ticket>(qk.tickets, '/support/tickets', {}, useAuthed());
export const useMyTicket = (id: string) => useQuery({ queryKey: qk.ticket(id), queryFn: () => api.get<Ticket>(`/support/tickets/${id}`) });
export const useSellerTickets = () => usePaged<Ticket>(qk.sellerTickets, '/brand/tickets');
export const useSellerTicket = (id: string) => useQuery({ queryKey: qk.sellerTicket(id), queryFn: () => api.get<Ticket>(`/brand/tickets/${id}`) });

// ---------- Ads ----------
export const useAdPrices = () => useQuery({ queryKey: qk.adPrices, queryFn: () => api.get<AdPrice[]>('/ads/prices'), staleTime: 10 * 60_000 });
export const useSellerAds = () => usePaged<Ad>(qk.sellerAds, '/brand/ads');
/** Paid "featured" products for the home screen. */
export const useFeatured = () => useQuery({ queryKey: qk.featured, queryFn: () => api.get<ProductCard[]>('/products/featured'), staleTime: 5 * 60_000 });
