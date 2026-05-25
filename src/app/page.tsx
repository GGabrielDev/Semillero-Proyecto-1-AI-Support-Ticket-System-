import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getRequestTranslator } from '@/lib/i18n/server';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const { t } = await getRequestTranslator();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-20">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-300">{t('home.tagline')}</p>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            {t('home.title')}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            {t('home.description')}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/login">
              <Button className="px-6 py-3 text-base">{t('home.signIn')}</Button>
            </Link>
            <Link href="/register">
              <Button className="px-6 py-3 text-base" variant="secondary">
                {t('home.createAccount')}
              </Button>
            </Link>
          </div>
        </div>

        <Card className="space-y-6">
          <div>
            <p className="text-sm font-medium text-sky-300">{t('home.whatYouGet')}</p>
            <ul className="mt-4 space-y-4 text-sm text-slate-300">
              <li>• {t('home.benefit1')}</li>
              <li>• {t('home.benefit2')}</li>
              <li>• {t('home.benefit3')}</li>
              <li>• {t('home.benefit4')}</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
            {t('home.footer')}
          </div>
        </Card>
      </div>
    </main>
  );
}
