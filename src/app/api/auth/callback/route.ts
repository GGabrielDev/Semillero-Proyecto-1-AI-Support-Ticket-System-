import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { getBaseUrl } from '@/lib/utils';
import { triggerN8nWorkflow } from '@/lib/n8n';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // User has successfully verified their email. Trigger the welcome email mini-workflow.
      void triggerN8nWorkflow('user_created', {
        userId: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || 'Valued User',
        verifiedAt: new Date().toISOString(),
        source: 'email_verification',
      });
    }
  }

  return NextResponse.redirect(`${origin || getBaseUrl()}${next}`);
}
