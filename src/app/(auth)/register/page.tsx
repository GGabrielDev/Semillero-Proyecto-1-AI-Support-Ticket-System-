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
import { createClient } from '@/lib/supabase/client';
import { RegisterSchema } from '@/lib/validations';

type RegisterValues = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.full_name,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    setMessage('Account created. Check your inbox if email confirmation is enabled, or continue to sign in.');
    router.push('/login');
    router.refresh();
  });

  return (
    <Card className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">Get started</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Create account</h1>
        <p className="mt-2 text-sm text-slate-400">Set up your support workspace access.</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="full_name">
            Full name
          </label>
          <Input id="full_name" {...register('full_name')} />
          {errors.full_name ? <p className="text-sm text-rose-300">{errors.full_name.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="email">
            Email
          </label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email ? <p className="text-sm text-rose-300">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="password">
            Password
          </label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password ? <p className="text-sm text-rose-300">{errors.password.message}</p> : null}
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

        <Button className="w-full" isLoading={isSubmitting} type="submit">
          Create account
        </Button>
      </form>

      <p className="text-sm text-slate-400">
        Already have an account?{' '}
        <Link className="text-sky-300 hover:text-sky-200" href="/login">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
