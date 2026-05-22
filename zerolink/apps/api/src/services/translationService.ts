import { createHash } from 'node:crypto';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { redis } from '../lib/redis.js';
import { translationQueue } from '../lib/queues.js';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'hi', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LOKALISE_LANGUAGE_ALIASES: Record<string, string> = { sw: 'sw_KE' };

type LokaliseTranslation = { language_iso: string; translation: string; is_untranslated?: number };
type LokaliseKey = { key_name: Record<string, string>; translations?: LokaliseTranslation[] };
type LokaliseKeysResponse = { keys?: LokaliseKey[] };
type GoogleTranslateResponse = [[string, string, unknown, unknown, number][], unknown, string];

const MEM_CACHE_MAX = 500;
const memoryCache = new Map<string, string>();

function memSet(key: string, value: string) {
  if (memoryCache.size >= MEM_CACHE_MAX) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey !== undefined) memoryCache.delete(firstKey);
  }
  memoryCache.set(key, value);
}

function resolveLanguage(lang: string): string {
  return LOKALISE_LANGUAGE_ALIASES[lang] ?? lang;
}

function keyNameFor(text: string, sourceLang: string, format: 'text' | 'html'): string {
  const hash = createHash('sha256').update(`${sourceLang}:${format}:${text}`).digest('hex').slice(0, 24);
  return `lesson_content.${sourceLang}.${format}.${hash}`;
}

function redisCacheKey(resolvedSource: string, resolvedTarget: string, format: string, text: string): string {
  const hash = createHash('sha256').update(text).digest('hex').slice(0, 32);
  return `trans:v1:${resolvedSource}:${resolvedTarget}:${format}:${hash}`;
}

async function lokaliseRequest<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  if (!config.LOKALISE_API_TOKEN) return null;
  const res = await fetch(`${config.LOKALISE_API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Api-Token': config.LOKALISE_API_TOKEN, ...init.headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) { logger.warn({ status: res.status, path }, 'Lokalise request returned non-OK status'); return null; }
  return await res.json() as T;
}

async function findLokaliseTranslation(keyName: string, targetLang: string): Promise<string | null> {
  if (!config.LOKALISE_PROJECT_ID) return null;
  const params = new URLSearchParams({ include_translations: '1', filter_keys: keyName, limit: '1' });
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
      keys: [{ key_name: keyName, platforms: ['web', 'other'], translations: [{ language_iso: resolveLanguage(sourceLang), translation: text }] }],
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
  const params = new URLSearchParams({ client: 'gtx', sl: sourceLang, tl: targetLang, dt: 't', q: text });
  const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;
  const data = await res.json() as GoogleTranslateResponse;
  const translated = data[0]?.map(part => part[0]).join('').trim();
  return translated && translated !== text ? translated : null;
}

async function fetchTranslation(
  text: string, targetLang: string, sourceLang: string, format: 'text' | 'html',
): Promise<string> {
  const resolvedTarget = resolveLanguage(targetLang);
  const resolvedSource = resolveLanguage(sourceLang);
  const keyName = keyNameFor(text, resolvedSource, format);

  if (!config.LOKALISE_API_TOKEN || !config.LOKALISE_PROJECT_ID) {
    const fallback = await machineTranslateFallback(text, targetLang, sourceLang);
    return fallback ?? text;
  }

  try {
    const existing = await retryTranslationLookup(keyName, resolvedTarget);
    if (existing) return existing;
    await createLokaliseKey(keyName, text, resolvedSource);
    const created = await retryTranslationLookup(keyName, resolvedTarget);
    if (created) return created;
    const fallback = await machineTranslateFallback(text, targetLang, sourceLang);
    return fallback ?? text;
  } catch (err) {
    logger.warn({ err, targetLang }, 'Lokalise translation failed; returning original text');
    const fallback = await machineTranslateFallback(text, targetLang, sourceLang);
    return fallback ?? text;
  }
}

export async function translateText(
  text: string, targetLang: string, sourceLang = 'en', format: 'text' | 'html' = 'text',
): Promise<string> {
  if (!text.trim() || targetLang === sourceLang) return text;

  const resolvedTarget = resolveLanguage(targetLang);
  const resolvedSource = resolveLanguage(sourceLang);
  const memKey = `${resolvedSource}:${resolvedTarget}:${format}:${text}`;
  const redisKey = redisCacheKey(resolvedSource, resolvedTarget, format, text);

  // 1. Memory cache hit
  const memHit = memoryCache.get(memKey);
  if (memHit) return memHit;

  // 2. Redis cache hit (7-day TTL)
  try {
    const redisHit = await redis.get(redisKey);
    if (redisHit) { memSet(memKey, redisHit); return redisHit; }
  } catch { /* redis unavailable, continue */ }

  // 3. Background job: return source text immediately; queue translation for caching
  void translationQueue.add('translateText', { text, targetLang, sourceLang, format, redisKey, memKey }, {
    attempts: 2, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 100, removeOnFail: 50,
  });

  return text;
}

// Used directly by background worker or server-side content rendering (awaited, not queued)
export async function translateTextDirect(
  text: string, targetLang: string, sourceLang = 'en', format: 'text' | 'html' = 'text',
): Promise<string> {
  if (!text.trim() || targetLang === sourceLang) return text;

  const resolvedTarget = resolveLanguage(targetLang);
  const resolvedSource = resolveLanguage(sourceLang);
  const memKey = `${resolvedSource}:${resolvedTarget}:${format}:${text}`;
  const redisKey = redisCacheKey(resolvedSource, resolvedTarget, format, text);

  const memHit = memoryCache.get(memKey);
  if (memHit) return memHit;

  try {
    const redisHit = await redis.get(redisKey);
    if (redisHit) { memSet(memKey, redisHit); return redisHit; }
  } catch { /* continue */ }

  const result = await fetchTranslation(text, targetLang, sourceLang, format);

  try { await redis.set(redisKey, result, 'EX', 604800); } catch { /* continue */ }
  memSet(memKey, result);
  return result;
}

export async function translateTexts(
  texts: string[], targetLang: string, sourceLang = 'en', format: 'text' | 'html' = 'text',
): Promise<string[]> {
  return Promise.all(texts.map(text => translateText(text, targetLang, sourceLang, format)));
}

// Awaited batch translation — used by the /translate/batch UI route so the response contains real translations
export async function translateTextsDirect(
  texts: string[], targetLang: string, sourceLang = 'en', format: 'text' | 'html' = 'text',
): Promise<string[]> {
  return Promise.all(texts.map(text => translateTextDirect(text, targetLang, sourceLang, format)));
}

export async function translateToAllLanguages(englishText: string): Promise<Record<SupportedLanguage, string>> {
  const result = { en: englishText } as Record<SupportedLanguage, string>;
  const targets = SUPPORTED_LANGUAGES.filter(lang => lang !== 'en');
  await Promise.allSettled(targets.map(async lang => { result[lang] = await translateText(englishText, lang, 'en'); }));
  return result;
}

export async function checkTranslationService(): Promise<boolean> {
  if (!config.LOKALISE_API_TOKEN || !config.LOKALISE_PROJECT_ID) return false;
  const data = await lokaliseRequest(`/projects/${config.LOKALISE_PROJECT_ID}`);
  return Boolean(data);
}
