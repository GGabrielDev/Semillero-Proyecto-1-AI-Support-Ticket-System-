'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import { LoginSchema } from '@/lib/validations';

type LoginValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword(values);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  });

  return (
    <Card className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">{t('auth.welcomeBack')}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">{t('auth.signIn')}</h1>
        <p className="mt-2 text-sm text-slate-400">{t('auth.accessWorkspace')}</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="email">
            {t('auth.email')}
          </label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email ? <p className="text-sm text-rose-300">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="password">
            {t('auth.password')}
          </label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password ? <p className="text-sm text-rose-300">{errors.password.message}</p> : null}
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <Button className="w-full" isLoading={isSubmitting} type="submit">
          {t('auth.signIn')}
        </Button>
      </form>

      <p className="text-sm text-slate-400">
        {t('auth.needAccount')}{' '}
        <Link className="text-sky-300 hover:text-sky-200" href="/register">
          {t('auth.createOne')}
        </Link>
      </p>
    </Card>
  );
}
