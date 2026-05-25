import { createAdminClient } from '@/lib/supabase/admin';

type NotificationType = 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'high_priority' | 'ai_action_pending';

/**
 * Inserts a single in-app notification row for the given user.
 * Silently swallows errors so callers are not interrupted by notification failures.
 */
export async function createNotification({
  userId,
  ticketId,
  type,
  title,
  body,
}: {
  userId: string;
  ticketId?: string;
  type: NotificationType;
  title: string;
  body?: string;
}) {
  const admin = createAdminClient();

  if (!admin) {
    return;
  }

  try {
    await admin.from('notifications').insert({
      user_id: userId,
      ticket_id: ticketId ?? null,
      type,
      title,
      body: body ?? null,
    });
  } catch (err) {
    console.error('[notifications] failed to create notification:', err);
  }
}

/**
 * Broadcasts an in-app notification to every user with the agent or admin role.
 * Used for events that the whole support team needs to see (e.g. high-priority tickets).
 */
export async function createNotificationsForAgents({
  ticketId,
  type,
  title,
  body,
}: {
  ticketId?: string;
  type: NotificationType;
  title: string;
  body?: string;
}) {
  const admin = createAdminClient();

  if (!admin) {
    return;
  }

  const { data: agents } = await admin
    .from('profiles')
    .select('id')
    .in('role', ['agent', 'admin']);

  if (!agents?.length) {
    return;
  }

  const rows = agents.map((agent: { id: string }) => ({
    user_id: agent.id,
    ticket_id: ticketId ?? null,
    type,
    title,
    body: body ?? null,
  }));

  try {
    await admin.from('notifications').insert(rows);
  } catch (err) {
    console.error('[notifications] failed to create notifications for agents:', err);
  }
}
