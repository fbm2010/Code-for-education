export type I18nMap = Record<string, string>;

export function resolveI18n(obj: I18nMap, lang: string): string {
  return obj[lang] ?? obj['en'] ?? Object.values(obj)[0] ?? '';
}

export function resolveI18nObj<T extends Record<string, I18nMap>>(
  obj: T,
  lang: string,
): Record<keyof T, string> {
  const result = {} as Record<keyof T, string>;
  for (const key of Object.keys(obj) as Array<keyof T>) {
    result[key] = resolveI18n(obj[key] as I18nMap, lang);
  }
  return result;
}
