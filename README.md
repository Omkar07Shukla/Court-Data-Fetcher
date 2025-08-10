# Court-Data Fetcher & Mini-Dashboard

A small full-stack web app that lets a user choose a Case Type and Case Number for a specific Indian court, then fetches and displays the case metadata and latest orders/judgments. The app logs each query and raw responses to a database and provides user-friendly errors.

Court chosen: Delhi High Court

Why: It’s a commonly referenced High Court with public search, typically ASP.NET-based forms using `__VIEWSTATE` and CAPTCHA. The app is built with a pluggable scraper so you can add other courts later.

## Features

- Form inputs: Case Type, Case Number, Filing Year, and Court selector.
- Backend scraping:
  - Handles view-state tokens (ASP.NET).
  - Supports auto CAPTCHA solving via 2Captcha or AntiCaptcha (when configured).
  - Provides a Manual Token fallback field in the UI if needed.
- Storage:
  - Logs each query and raw HTML response in PostgreSQL (Neon) when `DATABASE_URL` is provided.
  - Falls back to in-memory store if no DB env is set (useful for local/demo).
- Display:
  - Renders parsed case metadata and latest orders with links.
  - PDF downloads proxied via `/api/pdf-proxy` to avoid CORS.
- Error handling:
  - Friendly messages for invalid case numbers or site downtime.
- Extras:
  - Demo Mode parses a local HTML fixture for instant testing without live scraping.
  - SQL migration script in `/scripts/db/0001_init.sql`.

## Tech Stack

- Next.js App Router (RSC where applicable, API Routes for backend) 
- TypeScript
- shadcn/ui for UI components
- cheerio for HTML parsing
- Neon (@neondatabase/serverless) for Postgres (serverless) [set `DATABASE_URL`]
- 2Captcha / AntiCaptcha for CAPTCHA solving (optional, see env)

## Architecture

- Frontend: `app/page.tsx`, `components/case-form.tsx`, `components/results-card.tsx`
- API & Backend:
  - `app/api/search/route.ts` — Validates input, invokes scraper, logs to DB, returns parsed result.
  - `app/api/pdf-proxy/route.ts` — Server-side proxy for PDFs (download).
- Scrapers (pluggable):
  - `lib/scraper-runner.ts` — Dispatches to the appropriate court scraper.
  - `lib/scrapers/delhi-high-court.ts` — Live scraping + token handling + orders parsing.
  - `lib/captcha/solvers.ts` — 2Captcha/AntiCaptcha auto-solver (image-based).
- Database:
  - `lib/db.ts` — Neon/Postgres client and log function.
  - `lib/db-memory.ts` — In-memory fallback store.
  - `scripts/db/0001_init.sql` — DDL for Postgres tables.

## CAPTCHA Strategy

- Primary: Auto-solving via 2Captcha or AntiCaptcha with server-side env keys.
- Fallback: Manual token field in the UI if automated solving is not desired or fails.
- Demo Mode: Bypasses CAPTCHA and uses a saved HTML fixture for instant testing.

Important: Use CAPTCHA solving services only where legal and permissible for public records access. Respect site terms. Provide your own API keys and accept the associated costs and privacy implications.

## Setup

1) Install and run :

\`\`\`
pnpm i
pnpm dev
\`\`\`

2) Environment variables (server-side usage):

\`\`\`
# Database (Neon Postgres)
DATABASE_URL=postgres://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require

# CAPTCHA solvers (optional for Live Mode)
TWOCAPTCHA_API_KEY=your_2captcha_key
# OR
ANTICAPTCHA_API_KEY=your_anticaptcha_key

# Demo Mode toggle (client and server)
NEXT_PUBLIC_DEMO_MODE=true
# Optional: base URL for fixture fetch in some environments
NEXT_PUBLIC_BASE_URL=http://localhost:3000
\`\`\`

- If `DATABASE_URL` is not set, the app logs to an in-memory store and the UI still runs.
- If neither `TWOCAPTCHA_API_KEY` nor `ANTICAPTCHA_API_KEY` is set, the app cannot auto-solve CAPTCHA and may require manual token entry when using "Delhi High Court". You can also use `Demo (Offline HTML)` court option for testing.

3) Database schema (for Neon/Postgres):

- Run the SQL migration in `/scripts/db/0001_init.sql`. You can execute it in Neon SQL Editor or any psql client.

4) Live vs Demo

- Demo: Set `NEXT_PUBLIC_DEMO_MODE=true` or choose "Demo (Offline HTML)" in the UI to parse `public/fixtures/delhi-sample.html`.
- Live: Set `NEXT_PUBLIC_DEMO_MODE=false` (or unset), choose "Delhi High Court", and provide CAPTCHA solver keys.

## Notes on Robustness

- The scraper uses robust CSS selector fallbacks for common labels but may need updates if site markup changes.
- For complex JavaScript-driven pages, consider integrating a headless browser API (e.g., Browserless, ScrapingBee) server-side and plugging it into the scraper. The architecture allows swapping the scraping strategy.

## Security

- No secrets are hardcoded.
- Environment variables are read server-side only (on API routes).
- PDF downloads are proxied to avoid exposing user IP or hitting CORS issues.

## License

MIT

## Deliverables Checklist

- Code repo: Public, with MIT license file.
- README: Court choice, setup steps, CAPTCHA strategy, sample env vars — this file.
- Demo video: Record ≤ 5min screen capture showing demo mode and, if configured, live mode.
- Optional extras:
  - Dockerfile (not included by default).
  - Pagination for multiple orders (basic list implemented; can extend easily).
  - Unit tests (not included by default).
  - CI workflow (not included by default).

## References

- Next.js App Router examples and best practices for API routes, server actions, and forms [^1]
- v0 full-stack workflow guidance — colocating frontend and backend in Next.js and using integrations/envs [^2]

[^1]: https://nextjs.org/docs/app/building-your-application/examples
[^2]: https://vercel.com/docs/v0/workflows/full-stack-app
\`\`\`

```type='code' project="Court-Data Fetcher" file="scripts/db/0001_init.sql"
-- Schema for logging queries and responses

CREATE TABLE IF NOT EXISTS app_queries (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  court TEXT NOT NULL,
  case_type TEXT NOT NULL,
  case_number TEXT NOT NULL,
  filing_year TEXT NOT NULL,
  client_ip TEXT,
  status TEXT NOT NULL,
  error TEXT
);

CREATE TABLE IF NOT EXISTS app_responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id TEXT NOT NULL REFERENCES app_queries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_html TEXT,
  parsed_json JSONB
);

-- Useful index
CREATE INDEX IF NOT EXISTS idx_app_responses_query_id ON app_responses(query_id);
