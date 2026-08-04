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

| Variable                               | Required | Purpose                                                    |
| -------------------------------------- | -------- | ---------------------------------------------------------- |
| `APP_URL`                              | Yes      | Public app origin, for example `http://localhost:3000`     |
| `DATABASE_URL`                         | Yes      | Supabase/Postgres connection string                        |
| `CORSAIR_KEK`                          | Yes      | Encrypts Corsair credentials and signs tenant webhook URLs |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes      | Supabase project URL                                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes      | Supabase publishable/anon key                              |
| `GEMINI_API_KEY`                       | Agent    | Server-only key for the built-in agent                     |
| `GEMINI_AGENT_MODEL`                   | No       | Built-in model: `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`, `gemini-2.5-flash`, or `gemini-2.5-flash-lite`; other values fail startup validation |
| `OPENAI_API_KEY`                       | No       | Enables model-backed priority classification               |
| `OPENAI_PRIORITY_MODEL`                | No       | Optional priority-classifier model override                |

Create the server-side Gemini key in
[Google AI Studio](https://aistudio.google.com/apikey). Keep it in the hosting
provider's secret store and never expose it through a `NEXT_PUBLIC_*` variable.

Do not enable Supabase OAuth Server for this app. Supabase is the user identity provider for On Emit; Google OAuth credentials belong in Corsair.

### URLs

- Supabase site URL: `APP_URL`
- Supabase redirect allow-list: `${APP_URL}/auth/callback`
- Corsair OAuth callback: `${APP_URL}/api/corsair/oauth/callback`
- Corsair manual connect page: `${APP_URL}/connect`
- Realtime webhook: copy the protected tenant URL displayed in **Connected services**

For local Google webhooks, expose the app with ngrok and set `APP_URL` to the HTTPS tunnel before reconnecting integrations. Complete Corsair's Gmail Pub/Sub and Calendar watch setup in the provided videos; application code cannot create those provider resources without their credentials.

If the Google OAuth consent screen is **External** and still in **Testing**,
Google expires refresh tokens after seven days for Gmail/Calendar scopes. Keep
test users configured during development, then move the OAuth app to production
and complete any required scope verification before launch. An
`invalid_grant` response requires the user to reconnect the affected service
once; the agent chat provides that reconnect action inline.

## Database

Corsair owns `corsair_integrations`, `corsair_accounts`, `corsair_entities`, and `corsair_events`. On Emit adds `corsair_email_priorities`. Clean databases should use `pnpm db:migrate`. For a database created before Drizzle's migration journal, first take a backup and compare its live schema with the SQL in `drizzle/`. Establish and record a reviewed baseline that represents the migrations already present before running any newer migration; do not replay the initial migrations over existing tables or use `db:push` as a production baseline shortcut.

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Manual checks should cover Supabase sign-in, both Corsair connections, live inbox/calendar data, MIME email rendering, attachment download, reply/draft/actions, advanced search, event update/cancellation, priority caching, webhook refresh, and preview/confirm agent chat.

## Production deployment (Vercel + Supabase)

1. Create a production Supabase project and copy its project URL, publishable
   key, and Postgres connection string. Use the transaction pooler connection
   string for the deployed serverless app when available; use a direct
   connection for the one-off migration command.
2. Generate a permanent `CORSAIR_KEK` with at least 32 random bytes, store it in
   a password manager, and never rotate or regenerate it during ordinary
   redeployments. Existing encrypted integration credentials depend on it.
3. Before touching an existing database, take a backup and compare its current
   schema/migration history with `drizzle/`. For a clean database, set the
   production `DATABASE_URL` locally and run `pnpm db:migrate`. For an existing
   database, establish a reviewed baseline first so old migrations are not
   replayed. Do not run `pnpm db:push` against production.
4. In Supabase **Authentication > URL Configuration**, set **Site URL** to the
   final HTTPS app origin and add `<APP_URL>/auth/callback` as an exact redirect
   URL. Keep localhost and preview patterns only for their respective
   environments.
5. In Supabase **Authentication > Password Security**, require a strong
   password and enable leaked-password protection when the project plan
   supports it.
6. Import the GitHub repository into Vercel. Keep the detected Next.js preset,
   use `pnpm build` as the build command, and select the repository root as the
   root directory.
7. Add every required variable from `.env.example` to the Vercel **Production**
   environment. Set `APP_URL` to the final HTTPS origin with no path. Keep
   `DATABASE_URL`, `CORSAIR_KEK`, `GEMINI_API_KEY`, and `OPENAI_API_KEY`
   server-only; never rename them with a `NEXT_PUBLIC_` prefix.
8. Deploy once, attach the final custom domain if one is used, update `APP_URL`
   and Supabase URL settings if the origin changed, then redeploy because Vercel
   environment changes do not alter an already-built deployment.
9. In Corsair, configure the production Google OAuth credentials and set the
   callback to `<APP_URL>/api/corsair/oauth/callback`. Publish the Google OAuth
   consent screen (and complete any restricted/sensitive-scope verification)
   before launch so refresh tokens do not expire under Testing-mode rules.
10. Sign in to On Emit, open **Connected services**, and connect both Gmail and
    Google Calendar. Copy the tenant-protected webhook URL shown there into the
    Corsair Gmail and Calendar webhook configuration, then complete the Gmail
    Pub/Sub and Calendar watch setup from the Corsair videos.
11. Run the authenticated production smoke checklist below with dedicated test
    accounts. Use preview first, confirm each external write before execution,
    and remove test messages/events afterward.

### Authenticated production smoke checklist

- Sign up, confirm the account, sign out, and sign back in.
- Connect/reconnect Gmail and Calendar; verify status and account isolation.
- Load real inbox messages, open a MIME/HTML email, download an attachment,
  search with Gmail operators, save a draft, reply, archive, and toggle read
  state.
- Load the real calendar, create a 30-minute event with a test attendee, verify
  it in Google Calendar, update it, and cancel it with attendee notifications.
- Ask the agent to summarize a narrow unread range, preview an email/event
  action, reject one preview, then approve one test action. Verify conversation
  context and BYOK/default-model switching.
- Trigger one Gmail and one Calendar webhook and confirm the open browser
  refreshes without polling.
- Run Supabase's database linter and verify the RLS warnings for all
  `corsair_*` tables are cleared.

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
