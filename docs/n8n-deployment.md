# n8n Deployment Setup (Project Integration Only)

This document covers only the n8n integration steps for this app.

## 1) App environment variables

Set these in the app host (Render or equivalent):

```env
N8N_WEBHOOK_URL=https://your-n8n-domain/webhook/ticket-events
N8N_WEBHOOK_SECRET=your_shared_secret
CRON_SECRET=your_cron_secret
```

- `N8N_WEBHOOK_URL`: where the app sends outbound events.
- `N8N_WEBHOOK_SECRET`: only for inbound callbacks to `/api/webhooks/n8n`.
- `CRON_SECRET`: used by `/api/cron/daily-summary`.

## 2) Create the n8n webhook workflow

1. Create a new workflow.
2. Add **Webhook** node:
   - Method: `POST`
   - Path: `ticket-events`
3. Activate workflow.
4. Confirm your `N8N_WEBHOOK_URL` points to this exact webhook URL.

## 3) Configure the Switch node correctly

n8n wraps request payload under `body`, so use:

```text
{{$json.body.event}}
```

Add rules:
- `ticket_created`
- `ai_action_required`
- `high_priority_ticket`
- `daily_summary`
- `ticket_status_changed` (optional)
- `ai_action_decided` (optional)

## 4) Event lifecycle behavior (recommended)

Use one Slack message per ticket and keep editing it through the lifecycle.

| Event | Slack behavior |
|---|---|
| `ticket_created` | Create initial message |
| `high_priority_ticket` | Update existing ticket message with priority/risk warning |
| `ai_action_required` | Update existing ticket message with AI next action |
| `ai_action_decided` | Update existing ticket message with operator decision |
| `ticket_status_changed` | Update existing ticket message with latest status |
| `daily_summary` | Create/update a separate daily digest message |

For ticket lifecycle events, always key by `ticketId`.

## 5) Starter Slack lifecycle pattern (recommended)

Goal:
- `ticket_created`: post a message saying ticket was received and waiting for AI.
- `ai_action_required`: edit that same Slack message with AI output.

### A) `ticket_created` branch

1. Slack `chat.postMessage`:
   - Example text:
     - Ticket `{{$json.body.payload.ticketId}}` received.
     - Status: waiting for AI analysis.
2. Persist Slack response in Data Store:
   - Key: `{{$json.body.payload.ticketId}}`
   - Value: Slack `channel` and `ts`

### B) `ai_action_required` branch

1. Data Store read by key:
   - `{{$json.body.payload.ticketId}}`
2. Slack `chat.update`:
   - Channel: saved channel
   - Timestamp: saved ts
   - Include:
     - `{{$json.body.payload.nextAction}}`
     - `{{$json.body.payload.riskLevel}}`
     - `{{$json.body.payload.summary}}`
3. If key not found, fallback to `chat.postMessage`.

## 6) Event payload fields from this app

### `ticket_created`

Includes:
- `ticketId`
- `title`
- `priority`
- `createdBy`
- `lifecycleStatus=awaiting_ai_analysis`
- `correlationId=ticketId`
- `source=ticket_creation`

### `ai_action_required`

Includes:
- `ticketId`
- `nextAction`
- `summary`
- `riskLevel`
- `lifecycleStatus=ai_action_required`
- `correlationId=ticketId`
- `updatesEvent=ticket_created`

### `high_priority_ticket`

Includes:
- `ticketId`
- `priority`
- `riskLevel`
- `summary`
- `lifecycleStatus=high_priority_detected`
- `correlationId=ticketId`
- `updatesEvent=ticket_created`

### `ticket_status_changed`

Includes:
- `ticketId`
- `title`
- `status`
- `priority`
- `updatedBy`
- `lifecycleStatus=ticket_status_changed`
- `correlationId=ticketId`
- `updatesEvent=ticket_created`

### `ai_action_decided`

Includes:
- `actionId`
- `ticketId`
- `actionType`
- `decision`
- `decidedBy`
- `lifecycleStatus=ai_action_decided`
- `correlationId=ticketId`
- `updatesEvent=ai_action_required`

### `daily_summary`

Includes:
- `totalOpenTickets`
- `statusCounts`
- `tickets[]`
- `lifecycleStatus=daily_summary_generated`
- `correlationId=daily_summary_YYYY-MM-DD`

## 7) n8n branch configuration details

### A) `ticket_created`
1. Post Slack message.
2. Save Slack `channel` + `ts` in Data Store under key `{{$json.body.payload.ticketId}}`.

### B) `high_priority_ticket`
1. Read Data Store by key `{{$json.body.payload.ticketId}}`.
2. Slack `chat.update` the same message with priority and risk details.
3. If key missing, post new message and store `channel` + `ts`.

### C) `ai_action_required`
1. Read Data Store by key `{{$json.body.payload.ticketId}}`.
2. Slack `chat.update` with next action/summary/risk.
3. Fallback to `chat.postMessage` if key missing.

### D) `ai_action_decided`
1. Read Data Store by key `{{$json.body.payload.ticketId}}`.
2. Slack `chat.update` with decision and action type.
3. Fallback to `chat.postMessage` if key missing.

### E) `ticket_status_changed`
1. Read Data Store by key `{{$json.body.payload.ticketId}}`.
2. Slack `chat.update` with new status.
3. Fallback to `chat.postMessage` if key missing.

### F) `daily_summary`
1. Use key `{{$json.body.payload.correlationId}}`.
2. Post/update a digest message separate from ticket lifecycle messages.

## 8) Daily summary trigger

To trigger daily summary processing, call:

```text
POST /api/cron/daily-summary
Authorization: Bearer {CRON_SECRET}
```

This emits the `daily_summary` event to n8n.

## 9) Inbound callback security (optional)

If n8n calls back into this app:

```text
POST /api/webhooks/n8n
x-webhook-secret: {N8N_WEBHOOK_SECRET}
```

## 10) Common pitfalls

1. Using `{{$json.event}}` instead of `{{$json.body.event}}`.
2. Workflow not activated.
3. Wrong webhook path in `N8N_WEBHOOK_URL`.
4. Slack update failing because `channel`/`ts` were not persisted.
5. Not using `correlationId` / `ticketId` keys consistently across branches.
