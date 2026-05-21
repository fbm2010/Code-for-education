import { createHash } from 'node:crypto';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export const SUPPORTED_LANGUAGES = ['en', 'sw', 'fr', 'ar', 'hi', 'es', 'pt', 'ha'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LOKALISE_LANGUAGE_ALIASES: Record<string, string> = {
  sw: 'sw_KE',
};

type LokaliseTranslation = {
  language_iso: string;
  translation: string;
  is_untranslated?: number;
};

type LokaliseKey = {
  key_name: Record<string, string>;
  translations?: LokaliseTranslation[];
};

type LokaliseKeysResponse = {
  keys?: LokaliseKey[];
};

type GoogleTranslateResponse = [[string, string, unknown, unknown, number][], unknown, string];

const memoryCache = new Map<string, string>();

function resolveLanguage(lang: string): string {
  return LOKALISE_LANGUAGE_ALIASES[lang] ?? lang;
}

function keyNameFor(text: string, sourceLang: string, format: 'text' | 'html'): string {
  const hash = createHash('sha256').update(`${sourceLang}:${format}:${text}`).digest('hex').slice(0, 24);
  return `lesson_content.${sourceLang}.${format}.${hash}`;
}

async function lokaliseRequest<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  if (!config.LOKALISE_API_TOKEN) return null;

  const res = await fetch(`${config.LOKALISE_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Token': config.LOKALISE_API_TOKEN,
      ...init.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    logger.warn({ status: res.status, path }, 'Lokalise request returned non-OK status');
    return null;
  }

  return await res.json() as T;
}

async function findLokaliseTranslation(keyName: string, targetLang: string): Promise<string | null> {
  if (!config.LOKALISE_PROJECT_ID) return null;

  const params = new URLSearchParams({
    include_translations: '1',
    filter_keys: keyName,
    limit: '1',
  });
  const data = await lokaliseRequest<LokaliseKeysResponse>(`/projects/${config.LOKALISE_PROJECT_ID}/keys?${params.toString()}`);
  const key = data?.keys?.find(item => Object.values(item.key_name).includes(keyName));
  const translation = key?.translations?.find(item => item.language_iso === targetLang);

  if (!translation?.translation || translation.is_untranslated === 1) return null;
  return translation.translation;
}

async function createLokaliseKey(keyName: string, text: string, sourceLang: string): Promise<void> {
  if (!config.LOKALISE_PROJECT_ID || !config.LOKALISE_CREATE_MISSING_KEYS) return;

  await lokaliseRequest(`/projects/${config.LOKALISE_PROJECT_ID}/keys`, {
    method: 'POST',
    body: JSON.stringify({
      use_automations: true,
      keys: [
        {
          key_name: keyName,
          platforms: ['web', 'other'],
          translations: [
            {
              language_iso: resolveLanguage(sourceLang),
              translation: text,
            },
          ],
        },
      ],
    }),
  });
}

async function retryTranslationLookup(keyName: string, targetLang: string): Promise<string | null> {
  const attempts = Math.max(1, config.LOKALISE_TRANSLATION_RETRIES);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const translated = await findLokaliseTranslation(keyName, targetLang);
    if (translated) return translated;
  }
  return null;
}

async function machineTranslateFallback(text: string, targetLang: string, sourceLang: string): Promise<string | null> {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: sourceLang,
    tl: targetLang,
    dt: 't',
    q: text,
  });

  const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return null;

  const data = await res.json() as GoogleTranslateResponse;
  const translated = data[0]?.map(part => part[0]).join('').trim();
  return translated && translated !== text ? translated : null;
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = 'en',
  format: 'text' | 'html' = 'text',
): Promise<string> {
  if (!text.trim() || targetLang === sourceLang) return text;

  const resolvedTarget = resolveLanguage(targetLang);
  const resolvedSource = resolveLanguage(sourceLang);
  const cacheKey = `${resolvedSource}:${resolvedTarget}:${format}:${text}`;
  const keyName = keyNameFor(text, resolvedSource, format);

  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  if (!config.LOKALISE_API_TOKEN || !config.LOKALISE_PROJECT_ID) {
    logger.warn('Lokalise translation is not configured; using machine translation fallback');
    const fallback = await machineTranslateFallback(text, targetLang, sourceLang);
    return fallback ?? text;
  }

  try {
    const existing = await retryTranslationLookup(keyName, resolvedTarget);
    if (existing) {
      memoryCache.set(cacheKey, existing);
      return existing;
    }

    await createLokaliseKey(keyName, text, resolvedSource);

    const created = await retryTranslationLookup(keyName, resolvedTarget);
    if (created) {
      memoryCache.set(cacheKey, created);
      return created;
    }

    const fallback = await machineTranslateFallback(text, targetLang, sourceLang);
    if (fallback) {
      memoryCache.set(cacheKey, fallback);
      return fallback;
    }

    return text;
  } catch (err) {
    logger.warn({ err, targetLang }, 'Lokalise translation failed; returning original text');
    const fallback = await machineTranslateFallback(text, targetLang, sourceLang);
    return fallback ?? text;
  }
}

export async function translateTexts(
  texts: string[],
  targetLang: string,
  sourceLang = 'en',
  format: 'text' | 'html' = 'text',
): Promise<string[]> {
  return Promise.all(texts.map(text => translateText(text, targetLang, sourceLang, format)));
}

export async function translateToAllLanguages(englishText: string): Promise<Record<SupportedLanguage, string>> {
  const result = { en: englishText } as Record<SupportedLanguage, string>;
  const targets = SUPPORTED_LANGUAGES.filter(lang => lang !== 'en');

  await Promise.allSettled(
    targets.map(async lang => {
      result[lang] = await translateText(englishText, lang, 'en');
    }),
  );

  return result;
}

export async function checkTranslationService(): Promise<boolean> {
  if (!config.LOKALISE_API_TOKEN || !config.LOKALISE_PROJECT_ID) return false;
  const data = await lokaliseRequest(`/projects/${config.LOKALISE_PROJECT_ID}`);
  return Boolean(data);
}