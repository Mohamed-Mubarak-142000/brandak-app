// Arabic text with Latin digits: amounts and references must read exactly like the InstaPay receipt.
// Hermes (the Android JS engine) ships only part of Intl — no RelativeTimeFormat, and some builds
// lack locale data — so every formatter here is created defensively and has a plain fallback.
const LOCALE = 'ar-EG-u-nu-latn';

function make<T>(factory: () => T): T | null {
  try {
    return factory();
  } catch {
    return null;
  }
}

const money = make(() => new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }));
const date = make(() => new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }));
const shortDate = make(() => new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' }));
const dateTime = make(() => new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }));

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const pad = (n: number) => String(n).padStart(2, '0');

export const formatNumber = (n: number) => {
  if (money) return money.format(n);
  const [int, dec] = (Math.round(n * 100) / 100).toString().split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? `.${dec}` : '');
};
export const formatMoney = (amount: number) => `${formatNumber(amount)} ج.م`;

export const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return date ? date.format(d) : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const formatShortDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return shortDate ? shortDate.format(d) : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return dateTime ? dateTime.format(d) : `${d.getDate()} ${MONTHS[d.getMonth()]}، ${d.getHours()}:${pad(d.getMinutes())}`;
};

/** Arabic dual/plural agreement: 1 → دقيقة، 2 → دقيقتين، 3–10 → دقائق، 11+ → دقيقة. */
function count(n: number, one: string, two: string, few: string) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n <= 10) return `${n} ${few}`;
  return `${n} ${one}`;
}

export function formatRelative(iso?: string | null, now = Date.now()) {
  if (!iso) return '—';
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  const past = seconds >= 0;
  const abs = Math.abs(seconds);
  const wrap = (s: string) => (past ? `من ${s}` : `بعد ${s}`);
  if (abs < 60) return 'الآن';
  if (abs < 3600) return wrap(count(Math.round(abs / 60), 'دقيقة', 'دقيقتين', 'دقائق'));
  if (abs < 86_400) return wrap(count(Math.round(abs / 3600), 'ساعة', 'ساعتين', 'ساعات'));
  const days = Math.round(abs / 86_400);
  if (days === 1) return past ? 'امبارح' : 'بكرة';
  if (days < 30) return wrap(count(days, 'يوم', 'يومين', 'أيام'));
  return formatDate(iso);
}

/** "+201012345678" → "0101 234 5678", the way Egyptian numbers are read aloud. */
export function formatPhone(e164?: string | null) {
  if (!e164) return '—';
  const national = e164.replace(/^\+20/, '0');
  return national.length === 11 ? `${national.slice(0, 4)} ${national.slice(4, 7)} ${national.slice(7)}` : national;
}

/** Case- and diacritic-insensitive matching for quick search (Arabic letter variants unified). */
export function normalizeSearch(value: string) {
  return value
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/[\s-]+/g, '');
}

export const BILLING_LABEL = { MONTHLY: 'شهري', YEARLY: 'سنوي' } as const;
