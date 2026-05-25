'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { type Locale } from '@/lib/i18n/config';
import { translate, type Messages } from '@/lib/i18n/dictionaries';

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, locale, messages }: { children: ReactNode; locale: Locale; messages: Messages }) {
  return <I18nContext.Provider value={{ locale, messages }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider.');
  }

  return {
    locale: context.locale,
    messages: context.messages,
    t: (key: string, variables?: Record<string, string | number>) => translate(context.messages, key, variables),
  };
}

export function useLocale() {
  return useI18n().locale;
}
