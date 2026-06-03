import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { deleteAiConfig } from '@/lib/ai/config';

const ParamsSchema = z.object({
  id: z.string().uuid('Invalid configuration id.'),
});

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
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

  const result = await deleteAiConfig(params.data.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
