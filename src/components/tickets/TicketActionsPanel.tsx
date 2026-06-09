'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { TicketPriority, TicketStatus } from '@/types/ticket';
import type { AppUser } from '@/types/user';

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
  const { t } = useI18n();
  const [status, setStatus] = useState<TicketStatus>(currentStatus);
  const [priority, setPriority] = useState<TicketPriority>(currentPriority);
  const [assignedToId, setAssignedToId] = useState<string | null>(assignedTo);
  const [agents, setAgents] = useState<AppUser[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    setPriority(currentPriority);
  }, [currentPriority]);

  useEffect(() => {
    setAssignedToId(assignedTo);
  }, [assignedTo]);

  useEffect(() => {
    let active = true;
    async function fetchAgents() {
      try {
        const response = await fetch('/api/agents');
        if (response.ok) {
          const data = await response.json();
          if (active && data?.agents) {
            setAgents(data.agents);
          }
        }
      } catch (err) {
        console.error('Failed to fetch agents', err);
      }
    }
    void fetchAgents();
    return () => {
      active = false;
    };
  }, []);

  const saveChanges = async () => {
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, priority, assigned_to: assignedToId }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? t('tickets.unableToUpdate'));
      }

      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('tickets.unableToUpdate'));
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
        throw new Error(payload?.error ?? t('tickets.unableToAssign'));
      }

      setAssignedToId(currentUserId);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('tickets.unableToAssign'));
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">{t('tickets.actionsTitle')}</h2>
        <p className="mt-1 text-sm text-slate-400">{t('tickets.actionsSubtitle')}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="ticket-status">
          {t('tickets.status')}
        </label>
        <select
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          id="ticket-status"
          onChange={(event) => setStatus(event.target.value as TicketStatus)}
          value={status}
        >
          <option value="open">{t('common.status.open')}</option>
          <option value="in_progress">{t('common.status.in_progress')}</option>
          <option value="resolved">{t('common.status.resolved')}</option>
          <option value="closed">{t('common.status.closed')}</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="ticket-priority">
          {t('tickets.priority')}
        </label>
        <select
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          id="ticket-priority"
          onChange={(event) => setPriority(event.target.value as TicketPriority)}
          value={priority}
        >
          <option value="low">{t('common.priority.low')}</option>
          <option value="medium">{t('common.priority.medium')}</option>
          <option value="high">{t('common.priority.high')}</option>
          <option value="critical">{t('common.priority.critical')}</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="ticket-assignee">
          {t('tickets.assignee')}
        </label>
        <select
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors duration-200"
          id="ticket-assignee"
          onChange={(event) => setAssignedToId(event.target.value === 'unassigned' ? null : event.target.value)}
          value={assignedToId ?? 'unassigned'}
        >
          <option value="unassigned">{t('tickets.unassignedOption')}</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.full_name || agent.email}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
        {assignedTo === currentUserId
          ? t('tickets.assignedToYouDot')
          : assignedTo
            ? t('tickets.assignedToOtherDot')
            : t('tickets.unassignedDot')}
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button isLoading={isSaving} onClick={saveChanges} type="button">
          {t('tickets.saveChanges')}
        </Button>
        <Button
          disabled={assignedTo === currentUserId}
          isLoading={isAssigning}
          onClick={assignToMe}
          type="button"
          variant="secondary"
        >
          {assignedTo === currentUserId ? t('tickets.assignedToYou') : t('tickets.assignToMe')}
        </Button>
      </div>
    </Card>
  );
}
