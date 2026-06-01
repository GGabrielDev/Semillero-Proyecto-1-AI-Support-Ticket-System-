import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getDbAiConfigs, saveAiConfig } from '@/lib/ai/config';

export async function GET() {
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

  const configs = await getDbAiConfigs();

  // Mask API keys for security in UI responses
  const maskedConfigs = configs.map((c) => ({
    ...c,
    api_key: c.api_key ? '••••••••' : null,
  }));

  return NextResponse.json({ configs: maskedConfigs });
}

export async function POST(request: Request) {
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

  try {
    const body = await request.json();
    const { id, provider, model_name, api_key, base_url, is_active, fallback_order } = body;

    if (!provider || !model_name) {
      return NextResponse.json({ error: 'Provider and model name are required.' }, { status: 400 });
    }

    if (!['google', 'llama', 'deepseek'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider.' }, { status: 400 });
    }

    let finalApiKey = api_key;
    if (id && api_key === '••••••••') {
      const { data: existing } = await admin
        .from('ai_configs')
        .select('api_key')
        .eq('id', id)
        .maybeSingle();

      finalApiKey = existing?.api_key || null;
    }

    const result = await saveAiConfig({
      id: id || undefined,
      provider: provider as 'google' | 'llama' | 'deepseek',
      model_name,
      api_key: finalApiKey,
      base_url: base_url || null,
      is_active: is_active ?? false,
      fallback_order: fallback_order !== null && fallback_order !== undefined ? Number(fallback_order) : null,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: result.data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
