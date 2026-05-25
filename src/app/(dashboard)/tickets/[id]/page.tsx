import { notFound, redirect } from 'next/navigation';

import { AiSuggestionPanel } from '@/components/tickets/AiSuggestionPanel';
import { CommentForm } from '@/components/tickets/CommentForm';
import { TicketActionsPanel } from '@/components/tickets/TicketActionsPanel';
import { TicketRealtimeSync } from '@/components/tickets/TicketRealtimeSync';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getAuthContext, isAgentOrAdmin } from '@/lib/auth';
import type { AiAnalysisResult } from '@/lib/ai/types';
import { formatDate, getPriorityLabel } from '@/lib/utils';
import type { AiPendingAction, Ticket, TicketComment } from '@/types/ticket';

const priorityClasses = {
  low: 'border-slate-600 bg-slate-800 text-slate-200',
  medium: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200',
  high: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await getAuthContext();

  if (!user) {
    redirect('/login');
  }

  const { data } = await supabase.from('tickets').select('*').eq('id', id).maybeSingle();
  const ticket = (data as Ticket | null) ?? null;

  if (!ticket) {
    notFound();
  }

  let commentsQuery = supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true });

  if (!isAgentOrAdmin(profile?.role)) {
    commentsQuery = commentsQuery.eq('is_internal', false);
  }

  const { data: commentRows } = await commentsQuery;
  const comments = (commentRows ?? []) as TicketComment[];
  const initialPendingActions = isAgentOrAdmin(profile?.role)
    ? (((
        await supabase
          .from('ai_pending_actions')
          .select('*')
          .eq('ticket_id', ticket.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      ).data ?? []) as AiPendingAction[])
    : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-6">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-white">{ticket.title}</h1>
              <p className="mt-2 text-sm text-slate-400">Created {formatDate(ticket.created_at)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TicketStatusBadge status={ticket.status} />
              <Badge className={priorityClasses[ticket.priority]}>{getPriorityLabel(ticket.priority)}</Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
              <p className="mt-2 text-sm text-slate-200">{ticket.category || 'General'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last updated</p>
              <p className="mt-2 text-sm text-slate-200">{formatDate(ticket.updated_at)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignment</p>
              <p className="mt-2 text-sm text-slate-200">
                {ticket.assigned_to === user.id ? 'Assigned to you' : ticket.assigned_to ? 'Assigned' : 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{ticket.description}</p>
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Comments timeline</h2>
            <p className="mt-1 text-sm text-slate-400">Track internal notes and requester updates.</p>
          </div>

          {comments.length ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-200">{comment.is_internal ? 'Internal note' : 'Comment'}</p>
                      {comment.is_internal ? <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-200">Internal</Badge> : null}
                    </div>
                    <p className="text-xs text-slate-500">{formatDate(comment.created_at)}</p>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm text-slate-400">
              No comments yet.
            </div>
          )}
        </Card>

        <CommentForm canCreateInternal={isAgentOrAdmin(profile?.role)} ticketId={ticket.id} />
      </div>

      <div className="space-y-6">
        {isAgentOrAdmin(profile?.role) ? (
          <TicketActionsPanel
            assignedTo={ticket.assigned_to}
            currentPriority={ticket.priority}
            currentStatus={ticket.status}
            currentUserId={user.id}
            ticketId={ticket.id}
          />
        ) : null}

        <AiSuggestionPanel
          aiSuggestedPriority={ticket.ai_suggested_priority}
          aiSuggestedReply={ticket.ai_suggested_reply}
          aiSummary={ticket.ai_summary}
          comments={comments.map((comment) => comment.content)}
          currentUserRole={profile?.role ?? 'user'}
          description={ticket.description}
          initialAnalysis={(ticket.ai_analysis_json as AiAnalysisResult | null) ?? null}
          initialPendingActions={initialPendingActions}
          ticketId={ticket.id}
          title={ticket.title}
        />
      </div>

      <TicketRealtimeSync ticketId={ticket.id} />
    </div>
  );
}
