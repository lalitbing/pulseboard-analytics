# Pulseboard — Full‑Stack Product Analytics (OSS)

Pulseboard is a lightweight analytics platform you can self-host to **track custom product events**, **ingest them inline or through an async queue**, and **explore insights in a modern dashboard** with an optional **real‑time mode**. The backend runs entirely on [Convex](https://convex.dev) (database, functions, HTTP API, scheduler and live queries).

- **Live demo**: `https://pulseboard-platform.vercel.app/`
- **GitHub repo**: `https://github.com/lalitbing/pulseboard-analytics`
- **License**: MIT (`LICENSE`)

---

## What you can do with Pulseboard

- **Track events** via `POST /api/track` — written inline, or **queued** through the Convex scheduler for async ingestion
- **Explore analytics** in the dashboard:
  - **Overview**: KPIs, trend chart, top events, recent activity
  - **Events**: raw event exploration (filter/search)
  - **Integration**: copy/paste snippets + SDK guidance
- **Real-time mode (UI)**: when enabled, the dashboard subscribes to Convex live queries and updates instantly as events land
- **Custom event tracking UI**: a floating “Track custom event” modal with a “Queue (async)” toggle
- **Exports**: CSV export for Events / Top events

---

## Architecture (high level)

```mermaid
flowchart LR
  subgraph Clients
    EXT[External App / SDK / Fetch]
    UI[Dashboard (Vercel)]
  end

  subgraph Convex
    HTTP[HTTP actions /api/*]
    FN[Queries + mutations]
    SCH[(Scheduler queue)]
    DB[(events · dailyStats · projects)]
  end

  EXT -->|"POST /api/track (x-api-key)"| HTTP
  HTTP -->|"queued=false"| DB
  HTTP -->|"queued=true"| SCH
  SCH -->|"ingest"| DB

  UI -->|"query / mutation (WebSocket)"| FN
  FN --> DB
  DB -.->|"live query updates"| UI
```

### Components

- **Convex backend (`apps/dashboard/convex`)**
  - `schema.ts` — `projects` (API keys), `events` (raw events), `dailyStats` (per-day rollup per event name)
  - `http.ts` — public REST API (`/api/track`, `/api/track/batch`, `/api/stats/*`, `/api/project-info`, `/api/health`), validates `x-api-key`
  - `events.ts` — ingestion; every write also updates `dailyStats`. Queued events go through `ctx.scheduler`
  - `stats.ts` — dashboard queries (`summary`, `events`, `projectInfo`)
- **Dashboard (`apps/dashboard/src`)** — React + Vite, deployed on Vercel
  - Default mode: one-shot Convex queries on load / range change / after tracking
  - **Real-time mode**: the same queries via `useQuery`, which Convex re-runs whenever the data changes

### Why a `dailyStats` rollup?

KPIs, the chart and top events are computed from `dailyStats` (one row per project/day/event name) instead of scanning raw events. This keeps reads small no matter how many events you store, which matters on the Convex free tier and makes real-time mode cheap. The Events page reads raw events, capped at the newest 500 in the range.

---

## Application usage

### Local setup

```bash
cd apps/dashboard
npm install
npx convex dev        # logs in, links/creates a Convex project, writes .env.local, pushes functions
```

Create a project and API key (in another terminal, from `apps/dashboard`):

```bash
npx convex run projects:create '{"name":"Default Project","apiKey":"<a long random string>"}'
```

Add the key to `apps/dashboard/.env.local` (the Convex vars are written by `npx convex dev`):

```bash
CONVEX_DEPLOYMENT=dev:your-deployment
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment.convex.site
VITE_API_KEY=your_project_key
```

Then run the dashboard:

```bash
npm run dev
```

Health check: `https://your-deployment.convex.site/api/health`

### Deploying

- **Backend**: `npx convex deploy` pushes functions to your production Convex deployment. Create a production project with `npx convex run --prod projects:create '{...}'`.
- **Dashboard** (Vercel, root directory `apps/dashboard`): set `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL` and `VITE_API_KEY` to the production values.

---

## Tracking events

### Event name rules

The dashboard UI’s custom event input allows: **alphabets, numbers, underscore** (`[A-Za-z0-9_]+`). The API accepts any non-empty name up to 200 characters.

### API: Track event

```bash
curl -X POST "https://your-deployment.convex.site/api/track" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"event":"signup_completed","properties":{"plan":"pro"},"queued":false}'
```

- **Inline**: `queued:false` writes the event before responding.
- **Queued**: `queued:true` hands the event to the Convex scheduler and responds immediately; it is written moments later. (`useRedis` is still accepted as an alias for older clients.)
- **Batch**: `POST /api/track/batch` with `{"events":[...]}` (max 100 per request).

### Rate limits

Limits are per project (API key), using `@convex-dev/rate-limiter`:

- **Tracking**: 100 events/minute (token bucket, burst of 100). A batch costs one token per event. The dashboard's track modal shares this budget.
- **Stats API**: 60 requests/minute (burst of 30).

Over the limit, the API returns `429` with a `Retry-After` header and `{"error":"Rate limit exceeded","retryAfterSeconds":N}`.

### Time zone

All reporting uses **Indian Standard Time (IST, UTC+5:30)**: daily buckets, “today”, and the `from`/`to` dates in the stats API are IST calendar days. Raw event timestamps are stored as UTC milliseconds.

### API: Stats

```
GET /api/stats/events?from=YYYY-MM-DD&to=YYYY-MM-DD      → { total, daily: [{ date, count }] }
GET /api/stats/top-events?from=YYYY-MM-DD&to=YYYY-MM-DD  → { total, top: [{ event_name, count, last_seen }] }
```

---

## Dashboard UI features

### Pages

- **Overview** — KPI tiles (total events, unique events, avg per active day, peak day), events-over-time chart, top events, recent activity, CSV export
- **Events** — browse raw events for the selected date range
- **Integration** — API usage snippets, stats endpoints, SDK usage

### Real-time mode (what it means)

When **Real-time mode** is ON the dashboard subscribes to Convex live queries over a WebSocket, so new events show up without polling or refreshing. When it is OFF the dashboard fetches once and refreshes on interactions (date range, tracking an event, etc).

---

## Trade-offs (and why)

| Decision | Why we did it | Trade-off |
|---|---|---|
| **Convex for DB + API + queue + realtime** | One managed backend, no servers to keep awake, free tier covers demos | Vendor-specific APIs; no SQL (aggregations are done in code / rollups) |
| **Scheduler as the async queue** | Durable, transactional enqueue with no extra infra | Less visible/tunable than a dedicated queue + worker; no custom retry/DLQ policy |
| **`dailyStats` rollup** | Constant-size reads for KPIs/chart/top events | Extra write per event; rollup is per IST day (changing time zone needs `npx convex run events:rebuildDailyStats`) |
| **Per-project rate limits** | Protects the free-tier quota, since the demo API key is public | Legit bursts over 100 events/min get `429`s and must retry |
| **API key in the dashboard bundle** | Simple single-project demo | Anyone can read the key from the built JS; use auth for multi-tenant setups |
| **Real-time vs one-shot mode** | Real-time feels “alive”; one-shot is cheaper for big ranges | Two modes to reason about (same queries, though) |

---

## FAQs

### I’m getting 401/403 from the API

- **401**: missing `x-api-key`
- **403**: invalid API key (no row in the Convex `projects` table with that `apiKey`)

### Real-time mode says “Missing Convex env” or “Invalid API key”

- Set `VITE_CONVEX_URL` and `VITE_API_KEY` in `apps/dashboard/.env.local` (or in Vercel for production)
- Make sure the key exists in the deployment the dashboard points at (dev and prod have separate data)

---

## SDK usage (not published on npm)

`pulseboard-sdk` exists in `packages/sdk`, but it is **not published on npm** yet.

From this monorepo:

```bash
cd packages/sdk
npm install
npm run build
```

Then, from your app:

```bash
npm install file:../packages/sdk
```

Usage:

```ts
import { Analytics } from "pulseboard-sdk";

const analytics = new Analytics(
  "PROJECT_API_KEY",
  "https://your-deployment.convex.site/api/track"
);

analytics.track("signup_completed", {
  plan: "pro",
});
```

---

## License

MIT — see `LICENSE`.
