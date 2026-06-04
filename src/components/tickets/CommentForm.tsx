'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';

type CommentFormProps = {
  ticketId: string;
  canCreateInternal: boolean;
};

export function CommentForm({ ticketId, canCreateInternal }: CommentFormProps) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleInsertSuggestion = (event: CustomEvent<string>) => {
      setContent(event.detail);
      const element = document.getElementById('comment-content');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
    };
    window.addEventListener('insert-ai-suggestion', handleInsertSuggestion as EventListener);
    return () => {
      window.removeEventListener('insert-ai-suggestion', handleInsertSuggestion as EventListener);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          is_internal: isInternal,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to add comment.');
      }

      setContent('');
      setIsInternal(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to add comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <h3 className="text-lg font-semibold text-white">Add comment</h3>
          <p className="mt-1 text-sm text-slate-400">Share an update, workaround, or follow-up question.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="comment-content">
            Comment
          </label>
          <Textarea
            id="comment-content"
            onChange={(event) => setContent(event.target.value)}
            placeholder="Add your comment here..."
            value={content}
          />
        </div>

        {canCreateInternal ? (
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              checked={isInternal}
              className="h-4 w-4 rounded border border-slate-700 bg-slate-950"
              onChange={(event) => setIsInternal(event.target.checked)}
              type="checkbox"
            />
            Mark as internal note
          </label>
        ) : null}

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <Button isLoading={isSubmitting} type="submit">
          Post comment
        </Button>
      </form>
    </Card>
  );
}
