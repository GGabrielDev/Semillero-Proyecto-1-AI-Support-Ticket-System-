# AI Support Ticket System

A full-stack support ticket platform built with Next.js, Supabase, TypeScript, Tailwind CSS, and a swappable AI provider layer.

## Features

- Email/password authentication with Supabase Auth
- Dashboard metrics for ticket status, priority, and weekly resolution velocity
- Ticket CRUD, comments, assignment, and status management APIs
- AI-powered ticket analysis, reply suggestions, pending AI actions, and observability
- AI provider **fallback**: tries the local llama-server first, automatically falls back to Google Generative AI if the server is unreachable
- Admin user management and AI event auditing views
- n8n webhook stubs for ticket-created, high-priority, and daily-summary automations
- **Interactive startup check**: running `npm run dev` or `npm start` without required environment variables will prompt you to enter them, or print a clear error in CI/Render environments
- Built-in i18n with English default and Spanish translation support

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- AI SDK + Google Generative AI or llama-server
- n8n webhooks (optional)

---

## Quick Start (local development)

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- One of the following AI backends (see [AI Provider Setup](#ai-provider-setup)):
  - A **Google Generative AI** API key (easiest), **or**
  - A locally running **llama-server** instance

### 2. Clone and install

```bash
git clone https://github.com/<your-org>/ai-support-ticket-system.git
cd ai-support-ticket-system
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the values as described in the [Environment Variables](#environment-variables) table below.

> **Tip:** You can skip this step. When you run `npm run dev` for the first time, the startup script will detect missing required variables and **interactively prompt you** to enter them. The values are saved to `.env.local` automatically.

### 4. Run Supabase migrations

In your Supabase project's **SQL Editor**, run the migration files in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_ai_enhancements.sql
supabase/migrations/004_categories_notifications.sql
supabase/migrations/005_priority_order.sql
```

### 5. Start the development server

```bash
npm run dev
```

The startup script runs first. If any required environment variables are missing it will prompt you to enter them before Next.js starts.

---

## AI Provider Setup

The app supports two AI backends, selectable via the `AI_PROVIDER` environment variable. It will **automatically fall back to Google AI** if the llama-server is unreachable.

### Option A — Google Generative AI (recommended for quick start)

1. Get a free API key at <https://aistudio.google.com/app/apikey>.
2. Set in `.env.local`:
   ```
   AI_PROVIDER=google
   GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
   ```

### Option B — Local llama-server

Use this to run inference on your own hardware. The Render-hosted instance can still reach your local model by using a tunnel (see below).

#### 2a. Install and run llama-server

Using [llama.cpp](https://github.com/ggerganov/llama.cpp):

```bash
# Build llama.cpp (or download a pre-built binary)
git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp
cmake -B build && cmake --build build -j

# Download a GGUF model (e.g. Llama-3 8B)
# Then start the server on port 8080:
./build/bin/llama-server -m /path/to/model.gguf --port 8080
```

The server exposes an **OpenAI-compatible** `/v1/chat/completions` endpoint.

Set in `.env.local` for local development:

```
AI_PROVIDER=llama
LLAMA_SERVER_BASE_URL=http://localhost:8080
LLAMA_MODEL=llama3
```

#### 2b. Expose your local server to Render with ngrok

For the Render-hosted frontend/backend to reach your local llama-server, you need a public tunnel:

```bash
npx ngrok http 8080
```

ngrok prints a forwarding URL such as `https://xxxx-xx-xx.ngrok-free.app`. Copy that URL and set it in your **Render environment variables** (Dashboard → Service → Environment):

```
AI_PROVIDER=llama
LLAMA_SERVER_BASE_URL=https://xxxx-xx-xx.ngrok-free.app
```

> **Important:** ngrok free-tier URLs change every time you restart the tunnel. Update `LLAMA_SERVER_BASE_URL` in Render whenever the URL changes, or upgrade to a paid ngrok plan for a stable domain.

#### 2c. Fallback to Google AI

Set `GOOGLE_GENERATIVE_AI_API_KEY` in addition to the llama settings. If the llama-server is unreachable (e.g., your machine is offline), the app will **automatically fall back** to Google Generative AI and log a warning in the server console:

```
[AI] llama-server at https://... failed (…). Falling back to Google Generative AI (gemini-1.5-flash).
```

If neither provider is configured, the server logs an actionable error and the AI endpoint returns a 500 with setup instructions.

---

## Deploying to Render

### 1. Connect the repository

In the Render dashboard, create a new **Web Service** and connect this repository. Render will detect `render.yaml` and pre-populate the service settings.

### 2. Set environment variables

Go to your service's **Environment** tab and fill in all variables marked `sync: false` in `render.yaml`. The required ones are:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key |
| `NEXT_PUBLIC_APP_URL` | Your Render service URL (e.g. `https://your-app.onrender.com`) |
| `AI_PROVIDER` | `google` or `llama` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI key (required for google provider or as fallback) |
| `LLAMA_SERVER_BASE_URL` | ngrok URL of your local llama-server (only when `AI_PROVIDER=llama`) |

> If `GOOGLE_GENERATIVE_AI_API_KEY` is missing, Render's build log and startup log will print a clear warning. AI features will be disabled until it is set.

### 3. Deploy

Trigger a deploy. The `npm start` script runs the env check before Next.js starts. In non-interactive (CI) mode it will **exit 1** if any required variable is absent, showing exactly which ones are missing.

---

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Service-role key for admin routes, AI logging, cron, and migrations |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | Public app URL for redirects and links |
| `AI_PROVIDER` | ✅ Yes | `google` or `llama` (defaults to `google`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ⚠ Recommended | Google Generative AI key — required for the `google` provider and used as automatic fallback when `llama` is unreachable |
| `LLAMA_SERVER_BASE_URL` | When `AI_PROVIDER=llama` | Base URL for the llama-server OpenAI-compatible endpoint |
| `LLAMA_MODEL` | No | Llama model name sent to the server (default: `llama3`) |
| `N8N_WEBHOOK_URL` | Optional | Outbound n8n webhook URL for automation triggers |
| `N8N_WEBHOOK_SECRET` | Optional | Shared secret for inbound `/api/webhooks/n8n` requests |
| `CRON_SECRET` | Optional | Bearer token used by `/api/cron/daily-summary` |

---

## API Endpoints

| Endpoint | Method(s) | Description |
| --- | --- | --- |
| `/api/tickets` | `GET`, `POST` | List tickets or create a new ticket |
| `/api/tickets/[id]` | `GET`, `PATCH`, `DELETE` | View one ticket, update status/priority/assignment, or close it |
| `/api/tickets/[id]/comments` | `POST` | Add a public comment or internal note |
| `/api/tickets/[id]/ai-actions` | `GET`, `POST` | List pending AI actions for a ticket or create one |
| `/api/ai-actions/[actionId]` | `PATCH` | Approve or reject a pending AI action |
| `/api/ai/analyze` | `POST` | Analyze a ticket and persist the structured result |
| `/api/ai/suggest` | `POST` | Generate an AI reply suggestion |
| `/api/admin/users` | `GET` | Admin-only list of users and roles |
| `/api/admin/users/[id]` | `PATCH` | Admin-only role update endpoint |
| `/api/admin/ai-events` | `GET` | Agent/admin paginated AI event audit feed |
| `/api/webhooks/n8n` | `POST` | Inbound n8n acknowledgement webhook secured by `N8N_WEBHOOK_SECRET` |
| `/api/cron/daily-summary` | `GET` | Bearer-protected daily summary trigger that sends current open ticket stats to n8n |
| `/api/notifications` | `GET`, `PATCH` | List unread notifications or mark all as read |

---

## Internationalization (i18n)

- Default locale: `en`
- Supported locales: `en`, `es`
- Translation files:
  - `src/lib/i18n/dictionaries/en.json`
  - `src/lib/i18n/dictionaries/es.json`

The selected locale is stored in a `locale` cookie and can be changed from the language selector in the header.

---

## n8n Setup

### 1) Basic wiring

1. Set `N8N_WEBHOOK_URL` in the app to your n8n webhook endpoint (example: `https://your-n8n/webhook/ticket-events`).
2. In n8n create one workflow:
   - **Webhook** node (POST, path `ticket-events`)
   - **Switch** node after webhook
3. In Switch, evaluate:
   - `{{$json.body.event}}`
4. Create rules for:
   - `ticket_created`
   - `ai_action_required`
   - `high_priority_ticket`
   - `daily_summary`
   - `ticket_status_changed` (optional)
   - `ai_action_decided` (optional)

> n8n webhook payload is wrapped in `body`, so `{{$json.event}}` will fail. Use `{{$json.body.event}}`.

### 2) Starter workflow: send one Slack message, then keep updating it

This gives you the flow you asked for:
- `ticket_created` sends "ticket received, waiting for AI analysis"
- `ai_action_required` edits that same Slack message with AI output
- `high_priority_ticket`, `ticket_status_changed`, and `ai_action_decided` keep editing that same message

#### 2a) `ticket_created` branch

1. Slack node: `chat.postMessage`
2. Message example:
   - Ticket `{{$json.body.payload.ticketId}}` received.
   - Status: waiting for AI analysis.
3. Add Data Store (or DB) node to persist the Slack message reference:
   - Key: `{{$json.body.payload.ticketId}}`
   - Value: Slack `channel` + `ts` returned by `chat.postMessage`

#### 2b) `ai_action_required` branch

1. Read Data Store by key:
   - `{{$json.body.payload.ticketId}}`
2. Slack node: `chat.update`
   - Channel: saved channel
   - Timestamp: saved ts
3. Updated message example:
   - Ticket `{{$json.body.payload.ticketId}}`
   - AI next action: `{{$json.body.payload.nextAction}}`
   - Risk: `{{$json.body.payload.riskLevel}}`
   - Summary: `{{$json.body.payload.summary}}`

If no prior message exists, fallback to `chat.postMessage` so the alert is never lost.

#### 2c) Additional update branches

Use the same lookup key (`{{$json.body.payload.ticketId}}`) and `chat.update` for:
- `high_priority_ticket` (priority/risk escalation update)
- `ticket_status_changed` (status transition update)
- `ai_action_decided` (operator decision update)

### 3) Event payload notes

`ticket_created` payload now includes:
- `ticketId`
- `title`
- `priority`
- `createdBy`
- `lifecycleStatus=awaiting_ai_analysis`
- `correlationId=ticketId`

`ai_action_required` payload includes:
- `ticketId`
- `nextAction`
- `summary`
- `riskLevel`
- `lifecycleStatus=ai_action_required`
- `correlationId=ticketId`
- `updatesEvent=ticket_created`

`high_priority_ticket` payload includes:
- `ticketId`
- `priority`
- `riskLevel`
- `summary`
- `lifecycleStatus=high_priority_detected`
- `correlationId=ticketId`
- `updatesEvent=ticket_created`

`ticket_status_changed` payload includes:
- `ticketId`
- `title`
- `status`
- `priority`
- `updatedBy`
- `lifecycleStatus=ticket_status_changed`
- `correlationId=ticketId`
- `updatesEvent=ticket_created`

`ai_action_decided` payload includes:
- `actionId`
- `ticketId`
- `actionType`
- `decision`
- `decidedBy`
- `lifecycleStatus=ai_action_decided`
- `correlationId=ticketId`
- `updatesEvent=ai_action_required`

`daily_summary` payload includes:
- `totalOpenTickets`
- `statusCounts`
- `tickets[]`
- `lifecycleStatus=daily_summary_generated`
- `correlationId=daily_summary_YYYY-MM-DD`

### 4) Daily summary cron

Trigger `/api/cron/daily-summary` on a schedule with:
- `Authorization: Bearer {CRON_SECRET}`

### 5) Optional inbound callback security

For inbound callbacks to `/api/webhooks/n8n`, send:
- `x-webhook-secret: {N8N_WEBHOOK_SECRET}`

> When `N8N_WEBHOOK_URL` is not set, outbound webhook calls are skipped.

---

## Database Notes

- `tickets.ai_analysis_json` stores the full structured AI analysis result for observability.
- `ai_events` stores prompt text, model version, latency, and full result payloads.
- `tickets.category` intentionally remains a text column for backward compatibility; it maps to `categories.name` in the application layer.

---

## Deploy Checklist

- [ ] Run all Supabase migrations in order: `001`, `002`, `003`, `004`, `005`.
- [ ] Set all required Render environment variables from the table above.
- [ ] Set `NEXT_PUBLIC_APP_URL` to your Render service URL.
- [ ] Set `GOOGLE_GENERATIVE_AI_API_KEY` — required for Google AI and as llama fallback.
- [ ] If using llama: start `ngrok http 8080` locally and set `LLAMA_SERVER_BASE_URL` in Render.
- [ ] Configure `N8N_WEBHOOK_URL` to the public n8n webhook endpoint (optional).
- [ ] Configure n8n scheduled jobs or platform cron to call `/api/cron/daily-summary` with `CRON_SECRET` (optional).
- [ ] If you expose inbound n8n callbacks, configure `N8N_WEBHOOK_SECRET` on both sides (optional).
