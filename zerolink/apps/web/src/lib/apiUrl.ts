function isCodespaces(): boolean {
  if (typeof window === 'undefined') return false;
  // In GitHub Codespaces every port gets its own *.app.github.dev hostname.
  // Cross-port XHR has cookies stripped by the Codespaces tunnel, so we must
  // route everything through the Vite proxy (same origin) instead.
  return window.location.hostname.endsWith('.app.github.dev');
}

export function getApiBaseUrl(): string {
  // Force Vite proxy in Codespaces — keeps all cookies on the frontend origin.
  if (isCodespaces()) return '';

  const configured = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  if (configured) return configured;

  // Non-Codespaces fallback: derive API origin from the app URL or window.
  const appUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, '');
  if (appUrl) {
    try {
      const url = new URL(appUrl);
      url.port = '3000';
      return url.origin;
    } catch { /* fall through */ }
  }

  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href);
      url.port = '3000';
      return url.origin;
    } catch { /* fall through */ }
  }

  return '';
}

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
