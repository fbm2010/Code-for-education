export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  if (configured) return configured;
  return '';
}

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}