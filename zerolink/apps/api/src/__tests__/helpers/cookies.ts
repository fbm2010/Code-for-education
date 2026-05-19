/** Extract just the name=value part from Set-Cookie headers for use in Cookie request header */
export function parseCookies(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers['set-cookie'];
  if (!raw) return '';
  const vals = Array.isArray(raw) ? raw : [raw];
  return vals
    .map(c => (c.split(';')[0] ?? '').trim())
    .filter(Boolean)
    .join('; ');
}
