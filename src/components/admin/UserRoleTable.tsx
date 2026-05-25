'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import type { AppUser, UserRole } from '@/types/user';

type UserRow = Pick<AppUser, 'id' | 'email' | 'full_name' | 'role'>;

type UserRoleTableProps = {
  users: UserRow[];
};

const roleClasses: Record<UserRole, string> = {
  user: 'border-slate-600 bg-slate-800 text-slate-200',
  agent: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  admin: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
};

export function UserRoleTable({ users }: UserRoleTableProps) {
  const [rows, setRows] = useState(users);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateRole = async (userId: string, role: UserRole) => {
    setError(null);
    setSavingId(userId);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; user?: UserRow } | null;

      if (!response.ok || !payload?.user) {
        throw new Error(payload?.error ?? 'Unable to update user role.');
      }

      const updatedUser = payload.user;
      setRows((currentRows) => currentRows.map((row) => (row.id === updatedUser.id ? updatedUser : row)));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update user role.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="pb-3 pr-4 font-medium">Name</th>
              <th className="pb-3 pr-4 font-medium">Email</th>
              <th className="pb-3 pr-4 font-medium">Current role</th>
              <th className="pb-3 font-medium">Change role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-4 pr-4">{row.full_name || '—'}</td>
                <td className="py-4 pr-4 text-slate-400">{row.email}</td>
                <td className="py-4 pr-4">
                  <Badge className={roleClasses[row.role]}>{row.role}</Badge>
                </td>
                <td className="py-4">
                  <select
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    disabled={savingId === row.id}
                    onChange={(event) => updateRole(row.id, event.target.value as UserRole)}
                    value={row.role}
                  >
                    <option value="user">User</option>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
