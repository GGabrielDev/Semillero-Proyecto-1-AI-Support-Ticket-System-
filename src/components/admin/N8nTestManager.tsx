'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

interface MockPayloads {
  [key: string]: Record<string, unknown>;
}

const MOCK_PAYLOADS: MockPayloads = {
  ticket_created: {
    ticketId: "mock-uuid-ticket-101",
    title: "Cannot login to client portal",
    description: "Getting a 403 Forbidden error when trying to log in using my Google workspace account. Need this fixed ASAP.",
    priority: "medium",
    status: "open",
    createdBy: "mock-uuid-user-999",
    creatorEmail: "john.doe@example.com"
  },
  ticket_status_changed: {
    ticketId: "mock-uuid-ticket-101",
    title: "Cannot login to client portal",
    status: "resolved",
    priority: "medium",
    createdBy: "mock-uuid-user-999",
    creatorEmail: "john.doe@example.com",
    updatedBy: "agent.smith@example.com"
  },
  high_priority_ticket: {
    ticketId: "mock-uuid-ticket-202",
    title: "Payment gateway offline — API returning 504 gateway timeout",
    priority: "critical",
    createdBy: "mock-uuid-user-888",
    creatorEmail: "billing@majorclient.com",
    riskLevel: "critical",
    summary: "The main payment processor gateway is unresponsive. All checkouts are failing with 504 errors.",
    lifecycleStatus: "high_priority_detected",
    correlationId: "mock-uuid-ticket-202",
    updatesEvent: "ticket_created"
  },
  ai_action_required: {
    ticketId: "mock-uuid-ticket-202",
    title: "Payment gateway offline — API returning 504 gateway timeout",
    priority: "critical",
    createdBy: "mock-uuid-user-888",
    creatorEmail: "billing@majorclient.com",
    nextAction: "escalate",
    riskLevel: "critical",
    summary: "Payment processor checkout failure requires immediate engineering escalation.",
    lifecycleStatus: "ai_action_required",
    correlationId: "mock-uuid-ticket-202",
    updatesEvent: "ticket_created"
  },
  ai_action_decided: {
    ticketId: "mock-uuid-ticket-202",
    title: "Payment gateway offline — API returning 504 gateway timeout",
    priority: "critical",
    createdBy: "mock-uuid-user-888",
    creatorEmail: "billing@majorclient.com",
    actionType: "escalate",
    decision: "approved",
    decidedBy: "admin.chief@example.com"
  },
  daily_summary: {
    totalOpenTickets: 3,
    statusCounts: {
      open: 2,
      in_progress: 1
    },
    tickets: [
      {
        id: 101,
        title: "API Gateway returns 504 gateway timeout",
        status: "open",
        priority: "critical",
        summary: "Checkout page is down due to payment gateway failing with 504 status codes."
      },
      {
        id: 102,
        title: "Cannot reset password via email",
        status: "in_progress",
        priority: "medium",
        summary: "SMTP authentication errors preventing password reset emails from sending."
      },
      {
        id: 103,
        title: "Wrong price listing for item #92",
        status: "open",
        priority: "low",
        summary: "Pricing database has incorrect values for item 92."
      }
    ],
    lifecycleStatus: "daily_summary_generated",
    correlationId: `daily_summary_${new Date().toISOString().slice(0, 10)}`
  }
};

export function N8nTestManager() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('ticket_created');
  const [payloadText, setPayloadText] = useState(JSON.stringify(MOCK_PAYLOADS.ticket_created, null, 2));
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [fetchingDefault, setFetchingDefault] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);

  useEffect(() => {
    fetchDefaultWebhookUrl();
  }, []);

  const fetchDefaultWebhookUrl = async () => {
    try {
      const res = await fetch('/api/admin/n8n-test');
      if (res.ok) {
        const data = await res.json();
        if (data.defaultWebhookUrl) {
          setWebhookUrl(data.defaultWebhookUrl);
        }
      }
    } catch (err) {
      console.error('Failed to fetch default webhook URL:', err);
    } finally {
      setFetchingDefault(false);
    }
  };

  const handleEventChange = (event: string) => {
    setSelectedEvent(event);
    if (MOCK_PAYLOADS[event]) {
      setPayloadText(JSON.stringify(MOCK_PAYLOADS[event], null, 2));
    }
  };

  const handleUseTestUrl = () => {
    if (webhookUrl) {
      // If it contains /webhook/, replace with /webhook-test/
      if (webhookUrl.includes('/webhook/')) {
        setWebhookUrl(webhookUrl.replace('/webhook/', '/webhook-test/'));
      } else if (!webhookUrl.includes('/webhook-test/')) {
        // Just append or replace if it's a standard pattern
        setError('Cannot automatically rewrite URL. Make sure it contains /webhook/ to auto-replace.');
        setTimeout(() => setError(null), 5000);
      }
    }
  };

  const handleUseProdUrl = () => {
    if (webhookUrl) {
      if (webhookUrl.includes('/webhook-test/')) {
        setWebhookUrl(webhookUrl.replace('/webhook-test/', '/webhook/'));
      }
    }
  };

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setResponseStatus(null);
    setResponseText(null);

    // Validate JSON payload
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payloadText);
    } catch {
      setError('Invalid JSON payload. Please correct the formatting.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/n8n-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl,
          event: selectedEvent,
          payload: parsedPayload,
        }),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setSuccess(false);
        setError(data.error || 'Webhook trigger returned error code.');
      }
      
      setResponseStatus(data.status ?? res.status);
      setResponseText(data.responseText || JSON.stringify(data, null, 2));
    } catch (err) {
      setSuccess(false);
      setError(err instanceof Error ? err.message : 'Failed to connect to the test endpoint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Configuration Card */}
      <Card className="p-6 bg-slate-900 border-slate-800 text-white">
        <h2 className="text-xl font-medium mb-4">Webhook Settings</h2>
        
        <form onSubmit={handleTrigger} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 block">
              n8n Target Webhook URL
            </label>
            <Input
              type="url"
              required
              placeholder="https://n8n.instance.com/webhook/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="bg-slate-950 border-slate-800 focus:ring-sky-500 text-white w-full"
              disabled={fetchingDefault}
            />
            
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleUseTestUrl}
                className="px-2.5 py-1.5 text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Switch to Test (/webhook-test/)
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleUseProdUrl}
                className="px-2.5 py-1.5 text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Switch to Production (/webhook/)
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              n8n requires sending to <code className="bg-slate-950 px-1 py-0.5 rounded text-sky-400">/webhook-test/</code> endpoints when using the &quot;Listen for test event&quot; button in the n8n Workflow editor.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 block">
              Mock Event Type
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => handleEventChange(e.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ticket_created">Ticket Created (ticket_created)</option>
              <option value="ticket_status_changed">Ticket Status Changed (ticket_status_changed)</option>
              <option value="high_priority_ticket">High Priority Detected (high_priority_ticket)</option>
              <option value="ai_action_required">AI Action Required (ai_action_required)</option>
              <option value="ai_action_decided">AI Action Decided (ai_action_decided)</option>
              <option value="daily_summary">Daily summary (daily_summary)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 block">
              JSON Payload Body
            </label>
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              rows={12}
              spellCheck={false}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-500 text-white py-2 flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner />
                Triggering...
              </>
            ) : (
              'Trigger Mock Webhook'
            )}
          </Button>
        </form>
      </Card>

      {/* Result Card */}
      <Card className="p-6 bg-slate-900 border-slate-800 text-white flex flex-col min-h-[400px]">
        <h2 className="text-xl font-medium mb-4">Execution Status</h2>
        
        {success === null && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-6 border-2 border-dashed border-slate-800 rounded-xl">
            <svg className="w-12 h-12 mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="font-medium">No webhook sent yet</p>
            <p className="text-sm text-slate-600 mt-1">
              Select an event type, review the payload, and click trigger.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Spinner className="h-8 w-8 border-4 mb-4" />
            <p className="font-medium animate-pulse">Contacting n8n endpoint...</p>
          </div>
        )}

        {success !== null && !loading && (
          <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Result</span>
                <div className="flex items-center gap-2 mt-1">
                  {success ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25">Success</Badge>
                  ) : (
                    <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/25">Failed</Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">HTTP Status</span>
                <p className="text-xl font-mono mt-1 text-white font-bold">
                  {responseStatus ?? 'Unknown'}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm">
                <p className="font-semibold mb-1">Error message:</p>
                <p className="font-mono text-xs">{error}</p>
              </div>
            )}

            <div className="space-y-2 flex-1 flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Response Body</span>
              <pre className="flex-1 p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto text-xs font-mono text-slate-300 max-h-[300px]">
                {responseText || '(Empty Response)'}
              </pre>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
