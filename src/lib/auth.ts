import type { User } from '@supabase/supabase-js';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { AppUser, UserRole } from '@/types/user';

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type AuthContext = {
  supabase: ServerSupabaseClient;
  user: User | null;
  profile: AppUser | null;
};

async function loadProfile(userId: string, supabase: ServerSupabaseClient) {
  const admin = createAdminClient();
  const profileClient = admin ?? supabase;
  const { data } = await profileClient.from('profiles').select('*').eq('id', userId).maybeSingle();

  return (data as AppUser | null) ?? null;
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      profile: null,
    };
  }

  return {
    supabase,
    user,
    profile: await loadProfile(user.id, supabase),
  };
}

export function isAgentOrAdmin(role?: UserRole | null): role is 'agent' | 'admin' {
  return role === 'agent' || role === 'admin';
}

export function isAdmin(role?: UserRole | null): role is 'admin' {
  return role === 'admin';
}
