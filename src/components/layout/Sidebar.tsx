'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/user';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/tickets', label: 'Tickets' },
  { href: '/tickets/new', label: 'New Ticket' },
];

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-slate-800 bg-slate-950 px-6 py-6 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">AI Support</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Ticket Hub</h1>
        <p className="mt-2 text-sm text-slate-400">Role: {role}</p>
      </div>

      <nav className="mt-8 space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              className={cn(
                'block rounded-xl px-4 py-3 text-sm font-medium transition',
                isActive ? 'bg-sky-500/15 text-sky-200' : 'text-slate-300 hover:bg-slate-900 hover:text-white',
              )}
              href={link.href}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
