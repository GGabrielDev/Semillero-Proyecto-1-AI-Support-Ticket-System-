import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
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
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-300">AI-first support</p>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Resolve support tickets faster with guided AI triage.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Centralize inbound issues, assign owners, summarize context, and generate tailored customer replies from one dashboard.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/login">
              <Button className="px-6 py-3 text-base">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button className="px-6 py-3 text-base" variant="secondary">
                Create account
              </Button>
            </Link>
          </div>
        </div>

        <Card className="space-y-6">
          <div>
            <p className="text-sm font-medium text-sky-300">What you get</p>
            <ul className="mt-4 space-y-4 text-sm text-slate-300">
              <li>• Supabase auth and PostgreSQL-backed ticket management</li>
              <li>• AI summary, prioritization, and reply suggestions</li>
              <li>• Secure API routes with Zod validation and RLS-friendly data access</li>
              <li>• Vercel-ready deployment with optional Render service config</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
            Configure either Google Generative AI or a local llama-server endpoint without changing the UI.
          </div>
        </Card>
      </div>
    </main>
  );
}
