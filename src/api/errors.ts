/**
 * Arabic copy for API error codes. The API speaks English (`error.message`); the app shows
 * these instead, falling back to a generic message per HTTP status.
 */
const BY_CODE: Record<string, string> = {
  NETWORK: 'لا يوجد اتصال بالإنترنت. تحقق من الشبكة ثم أعد المحاولة',
  UNAUTHORIZED: 'انتهت الجلسة، سجّل الدخول مرة أخرى',
  INVALID_CREDENTIALS: 'البريد الإلكتروني أو الموبايل أو كلمة السر غير صحيحة',
  ACCOUNT_SUSPENDED: 'تم إيقاف هذا الحساب. تواصل مع الدعم',
  ACCOUNT_EXISTS: 'فيه حساب مسجّل بالبريد أو الموبايل ده بالفعل',
  INVALID_PHONE: 'رقم موبايل مصري غير صحيح',
  OTP_INVALID: 'الكود غير صحيح أو انتهت صلاحيته',
  OTP_COOLDOWN: 'استنى شوية قبل ما تطلب كود جديد',
  ALREADY_VERIFIED: 'تم التأكيد بالفعل',
  WRONG_PASSWORD: 'كلمة السر الحالية غير صحيحة',
  SAME_PASSWORD: 'اختار كلمة سر مختلفة عن الحالية',
  TOO_MANY_REQUESTS: 'محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى',
  VALIDATION_ERROR: 'راجع البيانات المدخلة',
  NOT_FOUND: 'العنصر ده مش موجود أو اتشال',
  FORBIDDEN: 'مش مسموح لك بالإجراء ده',
  PAYLOAD_TOO_LARGE: 'الملف أكبر من 4 ميجا',
  FILE_REQUIRED: 'اختار ملف الأول',
  FILE_TYPE_NOT_ALLOWED: 'نوع الملف غير مدعوم. استخدم صورة JPG أو PNG أو WEBP',
  INVALID_FILES: 'فيه ملفات مش موجودة. ارفعها تاني',

  CART_EMPTY: 'السلة فاضية',
  CART_FULL: 'السلة مليانة. خلّص الطلب الحالي الأول',
  CART_HAS_ISSUES: 'فيه منتجات في السلة محتاجة مراجعة قبل الطلب',
  INSUFFICIENT_STOCK: 'الكمية المطلوبة مش متوفرة',
  UNAVAILABLE: 'المنتج ده مش متاح دلوقتي',
  BELOW_MIN_ORDER: 'الطلب أقل من الحد الأدنى للبراند',
  NOT_DELIVERABLE: 'البراند ده مش بيوصّل للمحافظة دي',
  BRAND_NOT_ACCEPTING_ORDERS: 'البراند مش بيستقبل طلبات دلوقتي',
  PRICE_CHANGED: 'الأسعار اتغيرت. راجع الإجمالي الجديد',
  IDEMPOTENCY_KEY_REQUIRED: 'حصلت مشكلة في إرسال الطلب. حاول تاني',
  INVALID_TRANSITION: 'مينفعش تغيّر حالة الطلب للحالة دي',
  CONCURRENT_UPDATE: 'الطلب اتعدّل من مكان تاني. حدّث الصفحة وحاول تاني',
  REASON_REQUIRED: 'اكتب سبب الإلغاء',

  ALREADY_REVIEWED: 'قيّمت المنتج ده قبل كده',
  NOT_ELIGIBLE: 'تقدر تقيّم المنتج بعد ما يوصلك',
  ALREADY_REPORTED: 'بلّغت عن ده قبل كده، وفريقنا بيراجعه',

  BRAND_EXISTS: 'عندك براند بالفعل',
  NO_BRAND: 'لسه معندكش براند',
  BRAND_SUSPENDED: 'البراند موقوف ومينفعش يتعدّل',
  BRAND_NOT_ELIGIBLE: 'البراند لازم يتقبل الأول قبل الاشتراك',
  INVALID_STATE: 'الإجراء ده مش متاح في الحالة الحالية',
  PAYMENT_UNDER_REVIEW: 'فيه دفعة تحت المراجعة بالفعل',
  REFERENCE_ALREADY_USED: 'رقم العملية ده اتسجّل قبل كده',
  SUBSCRIPTION_REQUIRED: 'محتاج اشتراك فعّال عشان تنشر منتجات',
  PRODUCT_LIMIT: 'وصلت للحد الأقصى للمنتجات في باقتك',
  VARIANT_REQUIRED: 'أضف مقاس أو لون واحد على الأقل',
  INVALID_CATEGORY: 'القسم غير صحيح',
  INVALID_COMPARE_PRICE: 'السعر قبل الخصم لازم يكون أكبر من السعر',
  INVALID_STOCK_CHANGE: 'المخزون مينفعش يبقى بالسالب',
  DUPLICATE_ZONE: 'كل محافظة تتكتب مرة واحدة بس',
  DUPLICATE: 'القيمة دي مستخدمة قبل كده',
  CONFLICT: 'فيه تعارض في البيانات. حدّث وحاول تاني',
};

export function arabicError(code: string, status: number) {
  if (BY_CODE[code]) return BY_CODE[code];
  if (status === 401) return BY_CODE.UNAUTHORIZED;
  if (status === 403) return BY_CODE.FORBIDDEN;
  if (status === 404) return BY_CODE.NOT_FOUND;
  if (status === 429) return BY_CODE.TOO_MANY_REQUESTS;
  if (status === 400 || status === 422) return BY_CODE.VALIDATION_ERROR;
  if (status >= 500) return 'حصلت مشكلة في السيرفر. حاول تاني بعد شوية';
  return 'حدث خطأ غير متوقع';
}
