import { cookies, headers } from 'next/headers';

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  localeFromAcceptLanguage,
  normalizeLocale,
  type Locale,
} from '@/lib/i18n/config';
import { getMessages, translate, type Messages } from '@/lib/i18n/dictionaries';

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (cookieLocale) {
    return normalizeLocale(cookieLocale);
  }

  const headerStore = await headers();
  return localeFromAcceptLanguage(headerStore.get('accept-language'));
}

export function getTranslator(locale: Locale) {
  const messages = getMessages(locale);
  return {
    locale,
    messages,
    t: (key: string, variables?: Record<string, string | number>) => translate(messages, key, variables),
  };
}

export async function getRequestTranslator() {
  const locale = await getRequestLocale();
  return getTranslator(locale ?? DEFAULT_LOCALE);
}

export type { Messages };
