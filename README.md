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
supabase/migrations/006_ai_configs.sql
```

### 5. Start the development server

```bash
npm run dev
```

The startup script runs first. If any required environment variables are missing it will prompt you to enter them before Next.js starts.

---

## AI Provider Setup

The application features a secure, database-driven AI configuration panel with automatic fallback capabilities, supporting **Google Gemini**, **DeepSeek**, and local **Llama** endpoints.

### Option A — Database-Driven Setup (Recommended)

Manage all AI models dynamically from the **Admin panel** (`/admin/ai-config`):

1. **API Key Security**: API keys are symmetrically encrypted at rest using AES-256-GCM. Set the `AI_ENCRYPTION_KEY` variable in Next.js (standard 32-byte hex) to encrypt/decrypt database secrets securely.
2. **Access Admin Panel**: Sign in as an administrator, click **AI Configuration** in the sidebar.
3. **Configure Providers**:
   - Apply presets for **Google Gemini**, **DeepSeek**, or **Llama (Local)**.
   - Fill in your API keys, model versions (e.g., `gemini-1.5-flash` or `deepseek-chat`), and optional custom endpoints.
4. **Active vs Fallback**:
   - Mark one configuration as **Active Primary**.
   - Assign **Fallback Priority Numbers** (e.g., 1, 2, 3) to other configurations.
   - If the active primary provider returns an error, the app sequentially cascades down the fallback queue automatically.

---

### Option B — Local Llama-Server

To run inference on your own hardware using [llama.cpp](https://github.com/ggerganov/llama.cpp):

1. **Install and Run Server**:
   ```bash
   git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp
   cmake -B build && cmake --build build -j
   ./build/bin/llama-server -m /path/to/model.gguf --port 8080
   ```
2. **Ngrok Tunneling (for Render)**:
   ```bash
   npx ngrok http 8080
   ```
   Copy the HTTPS forwarding URL (e.g., `https://xxxx.ngrok-free.app`) to your database AI config or environment variables as `LLAMA_SERVER_BASE_URL`.

---

### Option C — Legacy Environment Variables (Fallback)

If no configs exist in the database, the system falls back to environment parameters in `.env.local`:

* **Google**: Set `AI_PROVIDER=google` and `GOOGLE_GENERATIVE_AI_API_KEY`.
* **DeepSeek**: Set `AI_PROVIDER=deepseek` and `DEEPSEEK_API_KEY` (optionally `DEEPSEEK_BASE_URL`).
* **Llama**: Set `AI_PROVIDER=llama`, `LLAMA_SERVER_BASE_URL`, and optionally `LLAMA_MODEL`.

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
| `AI_ENCRYPTION_KEY` | 32-byte hex key for database API Key symmetric encryption (generate with `openssl rand -hex 32`) |
| `AI_PROVIDER` | `google`, `deepseek`, or `llama` (Legacy fallback if database config is empty) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI key (Legacy fallback) |
| `LLAMA_SERVER_BASE_URL` | ngrok URL of your local llama-server (Legacy fallback) |

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
| `AI_ENCRYPTION_KEY` | ⚠ Recommended | 32-byte hex key used to encrypt/decrypt API keys in the database. Auto-generated dev fallback if not set. |
| `AI_PROVIDER` | No | `google`, `deepseek` or `llama` (Legacy fallback, defaults to `google`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | No | Google Generative AI key (Legacy fallback) |
| `LLAMA_SERVER_BASE_URL` | No | Base URL for the llama-server (Legacy fallback) |
| `LLAMA_MODEL` | No | Llama model name (Legacy fallback, default: `llama3`) |
| `DEEPSEEK_API_KEY` | No | DeepSeek API key (Legacy fallback) |
| `DEEPSEEK_BASE_URL` | No | Base URL for DeepSeek API (Legacy fallback, default: `https://api.deepseek.com/v1`) |
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
| `/api/admin/ai-config` | `GET`, `POST` | Admin-only retrieve or save AI configurations |
| `/api/admin/ai-config/[id]` | `DELETE` | Admin-only delete AI configuration |
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

- [ ] Run all Supabase migrations in order: `001` through `006`.
- [ ] Set all required Render environment variables from the table above.
- [ ] Set `NEXT_PUBLIC_APP_URL` to your Render service URL.
- [ ] Set `AI_ENCRYPTION_KEY` — required for database API Key symmetric encryption (generate with `openssl rand -hex 32`).
- [ ] Configure active and fallback AI models in the Admin Configuration panel (`/admin/ai-config`).
- [ ] (Legacy) If not using the Admin config panel, set your fallback credentials in env (`GOOGLE_GENERATIVE_AI_API_KEY`, etc.).
- [ ] Configure `N8N_WEBHOOK_URL` to the public n8n webhook endpoint (optional).
- [ ] Configure n8n scheduled jobs or platform cron to call `/api/cron/daily-summary` with `CRON_SECRET` (optional).
- [ ] If you expose inbound n8n callbacks, configure `N8N_WEBHOOK_SECRET` on both sides (optional).
