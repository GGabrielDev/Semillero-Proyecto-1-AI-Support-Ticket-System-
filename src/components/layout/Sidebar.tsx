'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useI18n } from '@/lib/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/user';

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const links = role === 'user'
    ? [
        { href: '/tickets', label: t('sidebar.tickets') },
        { href: '/tickets/new', label: t('sidebar.newTicket') },
      ]
    : [
        { href: '/dashboard', label: t('sidebar.overview') },
        { href: '/tickets', label: t('sidebar.tickets') },
        { href: '/tickets/new', label: t('sidebar.newTicket') },
        { href: '/admin/ai-events', label: t('sidebar.aiEvents') },
        ...(role === 'admin' ? [{ href: '/admin/users', label: t('sidebar.admin') }] : []),
      ];

  return (
    <aside className="flex w-full flex-col border-b border-slate-800 bg-slate-950 px-6 py-6 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">{t('sidebar.brand')}</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">{t('sidebar.title')}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {t('sidebar.role')}: {role}
        </p>
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
