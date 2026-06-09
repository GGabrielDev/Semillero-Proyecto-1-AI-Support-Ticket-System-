import { NextResponse } from 'next/server';

import { getAuthContext, isAgentOrAdmin } from '@/lib/auth';
import type { AppUser } from '@/types/user';

export async function GET() {
  const { supabase, user, profile } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAgentOrAdmin(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, created_at, updated_at')
    .in('role', ['agent', 'admin'])
    .order('full_name', { ascending: true })
    .order('email', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ agents: (data ?? []) as AppUser[] });
}
