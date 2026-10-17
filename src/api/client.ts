/**
 * API client. Calls the Brandak API directly with the bearer token from the session and
 * unwraps the `{ success, data, meta }` envelope.
 *
 * Refresh is single-flight: every request that hits a 401 at the same time waits on ONE
 * `/auth/refresh` call. The refresh token rotates on each use and the API treats a reused one
 * as theft, so parallel refreshes would sign the user out (the bug fixed in the dashboard).
 */
import { useSession, type Tokens } from '@/auth/session';
import { arabicError } from './errors';

export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(/\/+$/, '');

export interface ErrorDetail {
  field?: string;
  reason: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ErrorDetail[] = [],
  ) {
    super(message);
  }
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  unread?: number;
  [extra: string]: unknown;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  headers?: Record<string, string>;
  /** Skip the bearer token (login, register, refresh). */
  anonymous?: boolean;
}

let refreshing: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const { tokens, setTokens, signOut } = useSession.getState();
    if (!tokens?.refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        // Only a definitive rejection ends the session; a 5xx keeps it for the next try.
        if (res.status === 401 || res.status === 400) await signOut();
        return false;
      }
      await setTokens(json.data as Tokens);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function request<T>(path: string, opts: RequestOptions = {}) {
  const { method = 'GET', body, query, headers: extra, anonymous } = opts;
  // Built by hand: React Native's URLSearchParams is only partly implemented.
  const qs = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  const send = () => {
    const headers: Record<string, string> = { accept: 'application/json', ...extra };
    if (body !== undefined && !isForm) headers['content-type'] = 'application/json';
    const token = useSession.getState().tokens?.accessToken;
    if (token && !anonymous) headers.authorization = `Bearer ${token}`;
    return fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  };

  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && !anonymous && useSession.getState().tokens && (await refreshSession())) {
      res = await send();
    }
  } catch {
    throw new ApiError(0, 'NETWORK', arabicError('NETWORK', 0));
  }

  if (res.status === 204) return { data: null as T, meta: undefined };
  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    const code: string = json?.error?.code ?? 'UNKNOWN';
    // A 401 that survived the refresh means the session is over; the auth gate reacts to this.
    if (res.status === 401 && !anonymous && useSession.getState().status === 'authed') {
      await useSession.getState().signOut();
    }
    throw new ApiError(res.status, code, arabicError(code, res.status), json?.error?.details);
  }
  return { data: json.data as T, meta: json.meta as PageMeta | undefined };
}

export const api = {
  get: async <T>(path: string, query?: Query) => (await request<T>(path, { query })).data,
  page: async <T>(path: string, query?: Query): Promise<Page<T>> => {
    const { data, meta } = await request<T[]>(path, { query });
    return { items: data ?? [], meta: (meta ?? { page: 1, limit: 20, total: 0 }) as PageMeta };
  },
  post: async <T>(path: string, body: unknown = {}, headers?: Record<string, string>) =>
    (await request<T>(path, { method: 'POST', body, headers })).data,
  patch: async <T>(path: string, body: unknown) => (await request<T>(path, { method: 'PATCH', body })).data,
  del: async <T = null>(path: string) => (await request<T>(path, { method: 'DELETE' })).data,
  /** Login/register/forgot: no bearer, no refresh. */
  anon: async <T>(path: string, body: unknown) => (await request<T>(path, { method: 'POST', body, anonymous: true })).data,
};

/** First field-level error message for a form field, if the API sent one. */
export function fieldError(error: unknown, field: string) {
  if (!(error instanceof ApiError)) return undefined;
  return error.details.find((d) => d.field === field) ? error.message : undefined;
}

export const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'حدث خطأ غير متوقع';
