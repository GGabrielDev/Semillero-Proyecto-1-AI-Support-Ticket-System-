'use client';

import { useRouter } from 'next/navigation';

import { locales, LOCALE_COOKIE_NAME, type Locale } from '@/lib/i18n/config';
import { useI18n } from '@/lib/i18n/I18nProvider';

export function LocaleSwitcher() {
  const router = useRouter();
  const { locale, t } = useI18n();

  const onChange = (nextLocale: Locale) => {
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <label className="flex items-center gap-2 text-xs text-slate-300">
      <span className="uppercase tracking-wide text-slate-400">{t('common.language')}</span>
      <select
        aria-label={t('common.language')}
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
        onChange={(event) => onChange(event.target.value as Locale)}
        value={locale}
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {item === 'en' ? t('common.english') : t('common.spanish')}
          </option>
        ))}
      </select>
    </label>
  );
}
