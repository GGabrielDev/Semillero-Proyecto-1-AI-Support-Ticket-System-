'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { TicketPriority, TicketStatus } from '@/types/ticket';

type TicketActionsPanelProps = {
  ticketId: string;
  currentStatus: TicketStatus;
  currentPriority: TicketPriority;
  assignedTo: string | null;
  currentUserId: string;
};

export function TicketActionsPanel({
  ticketId,
  currentStatus,
  currentPriority,
  assignedTo,
  currentUserId,
}: TicketActionsPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState<TicketStatus>(currentStatus);
  const [priority, setPriority] = useState<TicketPriority>(currentPriority);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveChanges = async () => {
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, priority }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to update ticket.');
      }

      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update ticket.');
    } finally {
      setIsSaving(false);
    }
  };

  const assignToMe = async () => {
    setError(null);
    setIsAssigning(true);

    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assigned_to: currentUserId }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to assign ticket.');
      }

      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to assign ticket.');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Ticket actions</h2>
        <p className="mt-1 text-sm text-slate-400">Update workflow state and take ownership of the ticket.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="ticket-status">
          Status
        </label>
        <select
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          id="ticket-status"
          onChange={(event) => setStatus(event.target.value as TicketStatus)}
          value={status}
        >
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="ticket-priority">
          Priority
        </label>
        <select
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          id="ticket-priority"
          onChange={(event) => setPriority(event.target.value as TicketPriority)}
          value={priority}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
        {assignedTo === currentUserId ? 'Assigned to you.' : assignedTo ? 'Assigned to another teammate.' : 'Currently unassigned.'}
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button isLoading={isSaving} onClick={saveChanges} type="button">
          Save changes
        </Button>
        <Button
          disabled={assignedTo === currentUserId}
          isLoading={isAssigning}
          onClick={assignToMe}
          type="button"
          variant="secondary"
        >
          {assignedTo === currentUserId ? 'Assigned to you' : 'Assign to me'}
        </Button>
      </div>
    </Card>
  );
}
