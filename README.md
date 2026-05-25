# AI Support Ticket System

A full-stack support ticket platform built with Next.js, Supabase, TypeScript, Tailwind CSS, and a swappable AI provider layer.

## Features
- Email/password authentication with Supabase Auth
- Dashboard metrics for ticket status, priority, and weekly resolution velocity
- Ticket CRUD, comments, assignment, and status management APIs
- AI-powered ticket analysis, reply suggestions, pending AI actions, and observability
- Admin user management and AI event auditing views
- n8n webhook stubs for ticket-created, high-priority, and daily-summary automations

## Tech Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- AI SDK + Google Generative AI or llama-server
- n8n webhooks (optional)

## Getting Started
1. Copy `.env.example` to `.env.local` and fill in your keys.
2. Install dependencies with `npm install`.
3. Run Supabase migrations in order: `001_initial_schema.sql`, `002_rls_policies.sql`, `003_ai_enhancements.sql`, `004_categories_notifications.sql`.
4. Start the app with `npm run dev`.

## Environment Variables
| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service-role key for admin routes, AI logging, cron, and migrations |
| `AI_PROVIDER` | Yes | `google` or `llama` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | When `AI_PROVIDER=google` | Google Generative AI key |
| `LLAMA_SERVER_BASE_URL` | When `AI_PROVIDER=llama` | Base URL for the llama-server OpenAI-compatible endpoint |
| `LLAMA_MODEL` | When `AI_PROVIDER=llama` | Llama model name sent to the server |
| `N8N_WEBHOOK_URL` | Optional | Outbound n8n webhook URL for automation triggers |
| `N8N_WEBHOOK_SECRET` | Optional | Shared secret for inbound `/api/webhooks/n8n` requests |
| `CRON_SECRET` | Optional | Bearer token used by `/api/cron/daily-summary` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL for redirects and links |

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

## n8n Setup
Configure three workflows and point them to the app/webhook URLs you expose:
1. **Ticket created**: Receive the `ticket_created` event from `N8N_WEBHOOK_URL` and send acknowledgements or Slack messages.
2. **High-priority ticket**: Receive the `high_priority_ticket` event and notify on-call/ops teams.
3. **Daily summary**: Trigger `/api/cron/daily-summary` on a schedule with `Authorization: Bearer {CRON_SECRET}` and consume the outbound `daily_summary` payload.

For inbound callbacks to `/api/webhooks/n8n`, send the shared secret in the `x-webhook-secret` header.

## Database Notes
- `tickets.ai_analysis_json` stores the full structured AI analysis result for observability.
- `ai_events` now stores prompt text, model version, and full result payloads.
- `tickets.category` intentionally remains a text column for backward compatibility; it should map to `categories.name` in the application layer.

## Deploy Checklist
- Set all required Vercel environment variables from the table above.
- Run Supabase migrations in order: `001`, `002`, `003`, `004`.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is present in deployment environments so admin routes, cron, and AI logging work.
- Configure `N8N_WEBHOOK_URL` to the public n8n webhook endpoint.
- Configure n8n scheduled jobs or platform cron to call `/api/cron/daily-summary` with `CRON_SECRET`.
- If you expose inbound n8n callbacks, configure `N8N_WEBHOOK_SECRET` on both sides.
