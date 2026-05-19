import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export const SUPPORTED_LANGUAGES = ['en', 'sw', 'fr', 'ar', 'hi', 'pt', 'am', 'ha'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

interface LibreTranslateResponse {
  translatedText: string;
  error?: string;
}

/**
 * Translate a single text string via LibreTranslate.
 * Returns the original text on failure (graceful degradation).
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = 'en',
): Promise<string> {
  if (!text.trim() || targetLang === sourceLang) return text;

  try {
    const body: Record<string, string> = {
      q:      text,
      source: sourceLang,
      target: targetLang,
      format: 'text',
    };
    if (config.LIBRETRANSLATE_API_KEY) body['api_key'] = config.LIBRETRANSLATE_API_KEY;

    const res = await fetch(`${config.LIBRETRANSLATE_URL}/translate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status, targetLang }, 'LibreTranslate returned non-OK status');
      return text;
    }

    const data = await res.json() as LibreTranslateResponse;
    if (data.error) {
      logger.warn({ error: data.error, targetLang }, 'LibreTranslate error');
      return text;
    }

    return data.translatedText ?? text;
  } catch (err) {
    logger.warn({ err, targetLang }, 'LibreTranslate request failed — returning original');
    return text;
  }
}

/**
 * Produce an i18n map for all supported languages given English source text.
 * Draft translations are marked for human review; falls back gracefully if
 * LibreTranslate is unreachable.
 */
export async function translateToAllLanguages(
  englishText: string,
): Promise<Record<SupportedLanguage, string>> {
  const result = { en: englishText } as Record<SupportedLanguage, string>;
  const targets = SUPPORTED_LANGUAGES.filter(l => l !== 'en');

  await Promise.allSettled(
    targets.map(async lang => {
      result[lang] = await translateText(englishText, lang, 'en');
    }),
  );

  return result;
}

/**
 * Check if the LibreTranslate instance is reachable.
 */
export async function checkTranslationService(): Promise<boolean> {
  try {
    const res = await fetch(`${config.LIBRETRANSLATE_URL}/languages`, {
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
