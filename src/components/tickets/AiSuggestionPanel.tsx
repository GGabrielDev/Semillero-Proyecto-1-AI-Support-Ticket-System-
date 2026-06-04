'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { capitalizeWords, getPriorityLabel } from '@/lib/utils';
import type { AiAnalysisResult } from '@/lib/ai/types';
import type { AiPendingAction } from '@/types/ticket';
import type { UserRole } from '@/types/user';

type AiSuggestionPanelProps = {
  ticketId: string;
  title: string;
  description: string;
  comments: string[];
  aiSummary?: string | null;
  aiSuggestedPriority?: string | null;
  aiSuggestedReply?: string | null;
  initialAnalysis?: AiAnalysisResult | null;
  initialPendingActions?: AiPendingAction[];
  currentUserRole: UserRole;
};

export function AiSuggestionPanel({
  ticketId,
  comments,
  title,
  description,
  aiSummary,
  aiSuggestedPriority,
  aiSuggestedReply,
  initialAnalysis,
  initialPendingActions = [],
  currentUserRole,
}: AiSuggestionPanelProps) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(initialAnalysis ?? null);
  const [reply, setReply] = useState(aiSuggestedReply ?? 'No suggested reply yet.');
  const [pendingActions, setPendingActions] = useState<AiPendingAction[]>(initialPendingActions);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [decisionActionId, setDecisionActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commentPayload = useMemo(() => comments.filter(Boolean), [comments]);
  const canManageAiActions = currentUserRole === 'agent' || currentUserRole === 'admin';
  const summary = analysis?.summary ?? aiSummary ?? 'No summary generated yet.';
  const priority = analysis?.classification.priority ?? aiSuggestedPriority ?? 'Not analyzed';

  const createPendingAction = async (nextAnalysis: AiAnalysisResult) => {
    const response = await fetch(`/api/tickets/${ticketId}/ai-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actionType: nextAnalysis.nextAction,
        aiSuggestion: nextAnalysis,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      action?: AiPendingAction;
    } | null;

    if (!response.ok || !payload?.action) {
      throw new Error(payload?.error ?? 'Unable to create pending AI action.');
    }

    const action = payload.action;
    setPendingActions((currentActions) => {
      const otherActions = currentActions.filter((currentAction) => currentAction.id !== action.id);
      return [action, ...otherActions];
    });
  };

  const runAnalysis = async () => {
    setError(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId, title, description }),
      });
      const payload = (await response.json()) as {
        error?: string;
        analysis?: AiAnalysisResult;
      };

      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error ?? 'Unable to analyze ticket.');
      }

      setAnalysis(payload.analysis);

      if (canManageAiActions && ['escalate', 'close'].includes(payload.analysis.nextAction)) {
        await createPendingAction(payload.analysis);
      }

      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to analyze ticket.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runSuggestion = async () => {
    setError(null);
    setIsSuggesting(true);

    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId, title, description, comments: commentPayload }),
      });
      const payload = (await response.json()) as { error?: string; suggestion?: string };

      if (!response.ok || !payload.suggestion) {
        throw new Error(payload.error ?? 'Unable to generate a reply.');
      }

      setReply(payload.suggestion);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to generate a reply.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const decidePendingAction = async (actionId: string, decision: 'approved' | 'rejected') => {
    setError(null);
    setDecisionActionId(actionId);

    try {
      const response = await fetch(`/api/ai-actions/${actionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to update pending AI action.');
      }

      setPendingActions((currentActions) => currentActions.filter((action) => action.id !== actionId));
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update pending AI action.');
    } finally {
      setDecisionActionId(null);
    }
  };

  const copyToCommentBox = () => {
    const event = new CustomEvent('insert-ai-suggestion', { detail: reply });
    window.dispatchEvent(event);
  };

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">AI assistant</h2>
          <p className="mt-1 text-sm text-slate-400">Analyze priority, recommend next steps, and draft customer-ready responses.</p>
        </div>
        {isAnalyzing || isSuggesting ? <Spinner /> : null}
      </div>

      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
        <p className="text-sm text-slate-200">{summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested priority</p>
          <p className="text-sm text-slate-200">{getPriorityLabel(priority)}</p>
        </div>
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk level</p>
          <p className="text-sm text-slate-200">{analysis ? capitalizeWords(analysis.riskLevel) : '—'}</p>
        </div>
      </div>

      {analysis ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sentiment</p>
              <p className="text-sm text-slate-200">{capitalizeWords(analysis.classification.sentiment)}</p>
            </div>
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
              <p className="text-sm text-slate-200">{analysis.classification.category}</p>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggestions</p>
            <ul className="space-y-2 text-sm text-slate-200">
              {analysis.suggestions.map((suggestion) => (
                <li key={suggestion} className="flex gap-2">
                  <span className="text-sky-300">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested reply</p>
          {reply && reply !== 'No suggested reply yet.' && (
            <Button
              className="px-2.5 py-1.5 text-xs font-medium"
              onClick={copyToCommentBox}
              type="button"
              variant="secondary"
            >
              Use suggestion
            </Button>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm text-slate-200">{reply}</p>
      </div>

      {pendingActions.map((action) => (
        <div key={action.id} className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Pending AI action</p>
            <p className="mt-2 text-sm text-slate-100">AI recommends: {capitalizeWords(action.action_type)}. Apply?</p>
          </div>

          {canManageAiActions ? (
            <div className="flex flex-wrap gap-3">
              <Button
                isLoading={decisionActionId === action.id}
                onClick={() => decidePendingAction(action.id, 'approved')}
                type="button"
              >
                Approve
              </Button>
              <Button
                isLoading={decisionActionId === action.id}
                onClick={() => decidePendingAction(action.id, 'rejected')}
                type="button"
                variant="secondary"
              >
                Reject
              </Button>
            </div>
          ) : (
            <p className="text-sm text-amber-100">Awaiting agent review.</p>
          )}
        </div>
      ))}

      {analysis && pendingActions.length === 0 && ['escalate', 'close'].includes(analysis.nextAction) ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          Next recommended action: {capitalizeWords(analysis.nextAction)}.
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button isLoading={isAnalyzing} onClick={runAnalysis} type="button">
          Analyze ticket
        </Button>
        <Button isLoading={isSuggesting} onClick={runSuggestion} type="button" variant="secondary">
          Suggest reply
        </Button>
      </div>
    </Card>
  );
}
