import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

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

  return NextResponse.json({
    defaultWebhookUrl: process.env.N8N_WEBHOOK_URL || '',
  });
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
    const { webhookUrl, event, payload } = await request.json();

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Webhook URL is required.' }, { status: 400 });
    }

    if (!event) {
      return NextResponse.json({ error: 'Event name is required.' }, { status: 400 });
    }

    console.log(`[n8n-test] Sending event "${event}" to: ${webhookUrl}`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        payload,
        timestamp: new Date().toISOString(),
      }),
    });

    const status = response.status;
    let responseText = '';
    try {
      responseText = await response.text();
    } catch {
      responseText = '(No response body)';
    }

    return NextResponse.json({
      success: response.ok,
      status,
      responseText,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
