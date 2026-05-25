import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { UpdateUserRoleSchema } from '@/lib/validations';
import type { AppUser } from '@/types/user';

const ParamsSchema = z.object({
  id: z.string().uuid('Invalid user id.'),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: params.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json({ error: 'Admin client is not configured.' }, { status: 500 });
  }

  const { data: currentProfile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (currentProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = UpdateUserRoleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await admin
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', params.data.id)
    .select('id, email, full_name, role')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  return NextResponse.json({ user: data as Pick<AppUser, 'id' | 'email' | 'full_name' | 'role'> });
}
