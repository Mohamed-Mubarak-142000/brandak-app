/** The API wants full URLs; owners type handles or bare domains. */
export function normalizeSocial(kind: 'instagram' | 'facebook' | 'tiktok' | 'website', raw: string) {
  const v = raw.trim();
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '');
  if (kind === 'instagram' && !handle.includes('.')) return `https://instagram.com/${handle}`;
  if (kind === 'tiktok' && !handle.includes('.')) return `https://www.tiktok.com/@${handle}`;
  if (kind === 'facebook' && !handle.includes('.')) return `https://facebook.com/${handle}`;
  return `https://${v}`;
}

export const displaySocial = (url?: string) => (url ?? '').replace(/^https?:\/\/(www\.)?/, '');
