'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { getPriorityLabel } from '@/lib/utils';

type AiSuggestionPanelProps = {
  ticketId: string;
  title: string;
  description: string;
  comments: string[];
  aiSummary?: string | null;
  aiSuggestedPriority?: string | null;
  aiSuggestedReply?: string | null;
};

export function AiSuggestionPanel({
  ticketId,
  comments,
  title,
  description,
  aiSummary,
  aiSuggestedPriority,
  aiSuggestedReply,
}: AiSuggestionPanelProps) {
  const router = useRouter();
  const [summary, setSummary] = useState(aiSummary ?? 'No summary generated yet.');
  const [priority, setPriority] = useState(aiSuggestedPriority ?? 'Not analyzed');
  const [reply, setReply] = useState(aiSuggestedReply ?? 'No suggested reply yet.');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commentPayload = useMemo(() => comments.filter(Boolean), [comments]);

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
        analysis?: { summary: string; priority: string };
      };

      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error ?? 'Unable to analyze ticket.');
      }

      setSummary(payload.analysis.summary);
      setPriority(payload.analysis.priority);
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

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">AI assistant</h2>
          <p className="mt-1 text-sm text-slate-400">Analyze priority and draft customer-ready responses.</p>
        </div>
        {(isAnalyzing || isSuggesting) ? <Spinner /> : null}
      </div>

      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
        <p className="text-sm text-slate-200">{summary}</p>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested priority</p>
        <p className="text-sm text-slate-200">{getPriorityLabel(priority)}</p>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested reply</p>
        <p className="whitespace-pre-wrap text-sm text-slate-200">{reply}</p>
      </div>

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
