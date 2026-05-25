'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { getInitials } from '@/lib/utils';

type HeaderProps = {
  email: string;
  fullName?: string | null;
};

export function Header({ email, fullName }: HeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
    setIsLoggingOut(false);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur">
      <div>
        <p className="text-sm text-slate-400">Welcome back</p>
        <h2 className="text-xl font-semibold text-white">{fullName || email}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-sm font-semibold text-slate-200">
          {getInitials(fullName || email)}
        </div>
        <Button isLoading={isLoggingOut} onClick={handleLogout} type="button" variant="ghost">
          Sign out
        </Button>
      </div>
    </header>
  );
}
