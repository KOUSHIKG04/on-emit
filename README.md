# On Emit

On Emit is a Superhuman-style Gmail and Google Calendar command center built with Next.js 15, Supabase Postgres/Auth, and Corsair. Every integration request is tenant-scoped with the authenticated Supabase user ID; inbox and calendar data is loaded from the connected Google account, never hardcoded.

## Workflow improvements

- Read complete MIME email conversations with safe HTML, Markdown/plain-text fallback, inline images, optional remote images, and authenticated attachments.
- Reply, save reply drafts, archive, and change read state without leaving the thread.
- Search Gmail with native advanced operators and open results in the same reader.
- Filter a priority inbox classified from the newest email subject and body, cached in Postgres. OpenAI is optional; explainable local rules are the fallback.
- Create, edit, and cancel Calendar events while notifying attendees.
- Use keyboard actions: `Ctrl/Cmd+K` quick action, `/` search focus, `R` reply, `E` archive, `Shift+I` read, `Shift+U` unread, and `Ctrl/Cmd+Enter` send.
- Chat with Gmail and Calendar through Corsair MCP. External writes are unavailable during preview and are enabled only after explicit confirmation.
- Receive Corsair Gmail/Calendar webhooks and refresh connected browsers through Postgres `LISTEN/NOTIFY` and server-sent events, without polling Google APIs.

## Stack

- Next.js 15, React 19, TypeScript, tRPC, React Query
- Supabase Auth and Supabase Postgres
- Drizzle ORM
- Corsair with Gmail and Google Calendar plugins
- Corsair MCP, OpenAI Agents SDK, and optional OpenAI models
- shadcn/Base UI, Tailwind CSS, React Hook Form, Zustand

## Local setup

1. Install dependencies: `pnpm install`
2. Copy `.env.example` to `.env` and fill the required values.
3. For local development only, apply the schema with `pnpm db:push`. Never use
   `db:push` in production; review the generated SQL/schema diff, take a backup,
   and apply versioned migrations with `pnpm db:migrate` instead.
4. In Corsair, configure Gmail and Google Calendar OAuth credentials and the redirect URL shown below.
5. Start the app: `pnpm dev`
6. Sign in with Supabase, open **Connected services**, and connect Gmail and Calendar.

### Environment variables

| Variable                               | Required | Purpose                                                     |
| -------------------------------------- | -------- | ----------------------------------------------------------- |
| `APP_URL`                              | Yes      | Public app origin, for example `http://localhost:3000`      |
| `DATABASE_URL`                         | Yes      | Supabase/Postgres connection string                         |
| `CORSAIR_KEK`                          | Yes      | Encrypts Corsair credentials and signs tenant webhook URLs  |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes      | Supabase project URL                                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes      | Supabase publishable/anon key                               |
| `OPENAI_API_KEY`                       | No       | Enables model-backed priority classification and agent chat |
| `OPENAI_PRIORITY_MODEL`                | No       | Defaults to `gpt-5.6-luna`                                  |
| `OPENAI_AGENT_MODEL`                   | No       | Defaults to `gpt-5.6-terra`                                 |

Do not enable Supabase OAuth Server for this app. Supabase is the user identity provider for On Emit; Google OAuth credentials belong in Corsair.

### URLs

- Supabase site URL: `APP_URL`
- Supabase redirect allow-list: `${APP_URL}/auth/callback`
- Corsair OAuth callback: `${APP_URL}/api/corsair/oauth/callback`
- Corsair manual connect page: `${APP_URL}/connect`
- Realtime webhook: copy the protected tenant URL displayed in **Connected services**

For local Google webhooks, expose the app with ngrok and set `APP_URL` to the HTTPS tunnel before reconnecting integrations. Complete Corsair's Gmail Pub/Sub and Calendar watch setup in the provided videos; application code cannot create those provider resources without their credentials.

## Database

Corsair owns `corsair_integrations`, `corsair_accounts`, `corsair_entities`, and `corsair_events`. On Emit adds `corsair_email_priorities`. Clean databases should use `pnpm db:migrate`. For a database created before Drizzle's migration journal, first take a backup and compare its live schema with the SQL in `drizzle/`. Establish and record a reviewed baseline that represents the migrations already present before running any newer migration; do not replay the initial migrations over existing tables or use `db:push` as a production baseline shortcut.

## Verification

```bash
pnpm typecheck
pnpm build
```

Manual checks should cover Supabase sign-in, both Corsair connections, live inbox/calendar data, MIME email rendering, attachment download, reply/draft/actions, advanced search, event update/cancellation, priority caching, webhook refresh, and preview/confirm agent chat.

## Feature branches

| Branch                        | Feature                                      |
| ----------------------------- | -------------------------------------------- |
| `codex/fix-email-rendering`   | Safe full-fidelity email and attachments     |
| `codex/gmail-actions`         | Reply, drafts, archive, read state           |
| `codex/calendar-management`   | Edit/cancel events and attendee updates      |
| `codex/advanced-gmail-search` | Gmail operator search and `/` shortcut       |
| `codex/priority-inbox`        | Tenant-scoped AI/rules priority cache        |
| `codex/realtime-webhooks`     | Corsair webhook, SSE, Postgres notifications |
| `codex/corsair-agent-chat`    | Confirmed Corsair MCP agent chat             |
| `codex/final-documentation`   | README, final verification, and report       |

## Submission checklist

- GitHub repo: <https://github.com/KOUSHIKG04/on-emit>
- Live link: add after deployment
- Demo video: add after recording
- X/Twitter post: add after publishing
- LinkedIn post: add after publishing
- Corsair features: Gmail API, Google Calendar API, tenant isolation, OAuth connect, database cache, webhook processor, and MCP tools
- Bonus tasks: agent chat, realtime webhooks, keyboard shortcuts, command palette, priority filtering, advanced Gmail search, and Postgres-local priority caching

## Security notes

- Tenant IDs are derived server-side from validated Supabase claims.
- Corsair access tokens stay encrypted in Postgres and never reach the browser.
- Webhook URLs carry a constant-time-verified HMAC token.
- Email HTML is sanitized and isolated in an iframe; remote images are blocked until requested.
- Agent write tools are removed during preview and exposed only after confirmation.
