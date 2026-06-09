import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  const providedSecret = request.headers.get('x-webhook-secret');

  // Verify webhook secret if configured
  if (!secret) {
    console.warn('[Webhook] Warning: N8N_WEBHOOK_SECRET is not configured. Webhook signature check is bypassed.');
  } else if (providedSecret !== secret) {
    const expectedPrefix = secret.length > 4 ? `${secret.slice(0, 3)}...` : '***';
    const providedPrefix = providedSecret
      ? (providedSecret.length > 4 ? `${providedSecret.slice(0, 3)}...` : '***')
      : 'none';
    console.error(`[Webhook] Verification failed. Expected prefix: ${expectedPrefix}, Provided: ${providedPrefix}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.event || !body.payload) {
    return NextResponse.json({ error: 'Invalid payload: event and payload are required' }, { status: 400 });
  }

  const { event, payload } = body;
  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Database admin client is not configured' }, { status: 500 });
  }

  try {
    // 1. Resolve or look up the "n8n user" from profiles table, or auto-provision them
    const systemEmail = process.env.N8N_SYSTEM_EMAIL;
    if (!systemEmail) {
      return NextResponse.json({ error: 'N8N_SYSTEM_EMAIL environment variable is not configured' }, { status: 500 });
    }

    let n8nUserId: string | null = null;
    const { data: n8nProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', systemEmail)
      .maybeSingle();

    if (n8nProfile) {
      n8nUserId = n8nProfile.id;
    } else {
      // Auto-provision the n8n system user in Supabase auth and profiles
      const systemPassword = process.env.N8N_SYSTEM_PASSWORD || Math.random().toString(36).slice(-16);
      const { data: authUser, error: _createError } = await adminClient.auth.admin.createUser({
        email: systemEmail,
        password: systemPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'n8n Automation System',
        },
      });

      if (authUser?.user) {
        // Trigger handle_new_user should automatically insert the profile, but let's upsert to be safe
        const { data: upsertedProfile } = await adminClient
          .from('profiles')
          .upsert({
            id: authUser.user.id,
            email: systemEmail,
            full_name: 'n8n Automation System',
            role: 'agent', // Grant agent privileges so it can comment/update tickets
          })
          .select('id')
          .single();

        if (upsertedProfile) {
          n8nUserId = upsertedProfile.id;
        }
      }

      // Fallback if provisioning failed or was skipped
      if (!n8nUserId) {
        const { data: adminProfiles } = await adminClient
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1);
        if (adminProfiles && adminProfiles.length > 0) {
          n8nUserId = adminProfiles[0].id;
        }
      }
    }

    if (event === 'ticket_status_changed' || event === 'update_ticket') {
      const { ticketId, status, priority, assignedTo } = payload;

      if (!ticketId) {
        return NextResponse.json({ error: 'ticketId is required for update_ticket' }, { status: 400 });
      }

      const updates: Record<string, unknown> = {};
      if (status) {
        updates.status = status;
        if (['resolved', 'closed'].includes(status)) {
          updates.resolved_at = new Date().toISOString();
        } else {
          updates.resolved_at = null;
        }
      }
      if (priority) {
        updates.priority = priority;
      }
      if (assignedTo !== undefined) {
        updates.assigned_to = assignedTo;
      }

      const { data, error } = await adminClient
        .from('tickets')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updates as any)
        .eq('id', ticketId)
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, updatedTicket: data });
    }

    if (event === 'add_comment') {
      const { ticketId, content, isInternal, authorId } = payload;

      if (!ticketId || !content) {
        return NextResponse.json({ error: 'ticketId and content are required for add_comment' }, { status: 400 });
      }

      const commentAuthorId = authorId || n8nUserId;
      if (!commentAuthorId) {
        return NextResponse.json({ error: 'Author profile not found for comment' }, { status: 400 });
      }

      const { data, error } = await adminClient
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          author_id: commentAuthorId,
          content,
          is_internal: !!isInternal,
        })
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, newComment: data });
    }

    return NextResponse.json({ error: `Unsupported event type: ${event}` }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during webhook processing',
    }, { status: 500 });
  }
}

