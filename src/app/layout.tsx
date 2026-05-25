import type { Metadata } from 'next';
import localFont from 'next/font/local';

import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { getMessages } from '@/lib/i18n/dictionaries';
import { getRequestLocale } from '@/lib/i18n/server';

import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'AI Support Ticket System',
  description: 'Smart support workflows powered by Supabase, Next.js, and configurable AI providers.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <html className="dark" lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 text-slate-50 antialiased`}>
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
