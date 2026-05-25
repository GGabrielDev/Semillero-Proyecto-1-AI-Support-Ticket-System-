import en from '@/lib/i18n/dictionaries/en.json';
import es from '@/lib/i18n/dictionaries/es.json';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';

export const dictionaries = {
  en,
  es,
} as const;

export type Messages = typeof en;

function getPathValue(obj: unknown, path: string): string | undefined {
  if (!path) return undefined;

  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj) as string | undefined;
}

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function translate(
  messages: Messages,
  key: string,
  variables?: Record<string, string | number>,
): string {
  const raw = getPathValue(messages, key);
  if (typeof raw !== 'string') {
    return key;
  }

  if (!variables) return raw;

  return raw.replace(/\{\{(\w+)\}\}/g, (_, variable: string) => {
    const value = variables[variable];
    return value === undefined || value === null ? '' : String(value);
  });
}
