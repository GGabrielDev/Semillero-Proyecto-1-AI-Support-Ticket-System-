export const locales = ['en', 'es'] as const;

export type Locale = (typeof locales)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE_NAME = 'locale';

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && locales.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function localeFromAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const tokens = acceptLanguage
    .split(',')
    .map((part) => part.split(';')[0]?.trim().toLowerCase())
    .filter(Boolean);

  for (const token of tokens) {
    if (token === 'es' || token.startsWith('es-')) {
      return 'es';
    }
    if (token === 'en' || token.startsWith('en-')) {
      return 'en';
    }
  }

  return DEFAULT_LOCALE;
}
