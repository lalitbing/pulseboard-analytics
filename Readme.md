Here’s a **production-grade README.md** you can directly use in your repo.
It’s structured for recruiters, engineers, and open-source users.

---

# 🚀 Pulseboard – Full-Stack Analytics Platform

Pulseboard is a lightweight, scalable analytics platform built from scratch to track custom events, process them asynchronously, and visualize insights in real time.

It is designed as a **cost-efficient alternative to paid analytics tools** while following production-grade system design patterns.

**Live Demo**
👉 [https://pulseboard-platform.vercel.app/](https://pulseboard-platform.vercel.app/)

---

# 📌 Features

* Custom event tracking API
* Async ingestion using Redis queue
* Background worker for reliable processing
* Real-time dashboard updates
* KPI metrics & charts
* Date range filters
* Fully responsive UI
* API key authentication
* Zero-cost infrastructure setup

---

# 🏗 Architecture

```
External Apps
      |
      v
  SDK / Fetch
      |
      v
Backend API (Render)
      |
      v
Redis Queue (Upstash)
      |
      v
Worker (Node.js)
      |
      v
Supabase (Postgres)
      |
      v
Realtime Stream
      |
      v
Dashboard (Vercel)
```

---

# 🔄 System Flow

### Event Ingestion

```
Client → POST /api/track
        → API validates key
        → Push to Redis queue
        → Worker consumes
        → Store in DB
```

### Analytics Rendering

```
Dashboard → GET /api/stats
           → API queries DB
           → Aggregates
           → Charts rendered
```

### Real-Time Updates

```
DB Insert
   ↓
Supabase Realtime
   ↓
WebSocket
   ↓
Frontend updates instantly
```

---

# 🛠 Tech Stack

### Frontend

* React
* TypeScript
* Tailwind CSS
* Recharts
* Vite
* Hosted on Vercel

### Backend

* Node.js
* Express
* Zod validation
* API key middleware
* Hosted on Render

### Infra

* Redis (Upstash)
* Supabase (PostgreSQL)
* Background worker (Node.js)

---

# 📁 Monorepo Structure

```
apps/
 ├── api/        # Backend API
 ├── dashboard/  # Frontend
 └── worker/     # Background processor

packages/
 └── sdk/        # Analytics SDK
```

---

# ⚙ Setup Guide

## 1️⃣ Clone Repo

```bash
git clone <repo-url>
cd pulseboard
```

---

## 2️⃣ Backend Setup

```bash
cd apps/api
npm install
npm run dev
```

Create `.env`

```
SUPABASE_URL=
SUPABASE_KEY=
REDIS_URL=
PORT=4000
```

Health check:

```
http://localhost:4000/api/health
```

---

## 3️⃣ Worker Setup

```bash
cd apps/worker
npm install
npm run dev
```

Worker listens to Redis and writes to DB.

---

## 4️⃣ Frontend Setup

```bash
cd apps/dashboard
npm install
npm run dev
```

Create `.env`

```
VITE_API_URL=http://localhost:4000/api
VITE_API_KEY=your_project_key
```

---

# 📡 API Usage

### Track Event

```bash
POST /api/track

Headers:
x-api-key: YOUR_API_KEY

Body:
{
  "event": "signup",
  "properties": {
    "plan": "pro"
  }
}
```

---

### Fetch Stats

```
GET /api/stats/events?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/stats/top-events
```

---

# 📦 SDK Usage

```bash
npm install pulseboard-sdk
```

```ts
import { Analytics } from "pulseboard-sdk";

const analytics = new Analytics(
  "PROJECT_API_KEY",
  "https://your-api-domain/api/track"
);

analytics.track("signup", {
  plan: "pro"
});
```

---

# 🔐 Security

* API key based authentication
* Env-based secrets
* Input validation
* CORS handling
* No secrets exposed on frontend

---

# 📊 Use Cases

* Internal product analytics
* Feature usage tracking
* User behavior analysis
* Funnel building
* Experiment tracking
* Replacing paid tools
* Engineering portfolio project

---

# ⚖ Trade-Offs

| Decision              | Reason           |
| --------------------- | ---------------- |
| Queue-based ingestion | Non-blocking API |
| Local worker          | Zero cost        |
| Supabase              | Managed DB       |
| Render                | Easy deploy      |
| Custom dashboard      | Product control  |

---

# 📈 Scaling Strategy

Future improvements:

* Multiple workers
* Horizontal API scaling
* Batch ingestion
* Rate limiting
* Dead-letter queues
* Auth dashboard
* Data export

---

# 🧪 Observability (Planned)

* Request logging
* Queue depth metrics
* Error monitoring
* Alerts

---

# 💰 Cost

| Service  | Cost  |
| -------- | ----- |
| Frontend | Free  |
| Backend  | Free  |
| Redis    | Free  |
| DB       | Free  |
| Worker   | Local |

**Total: $0**

---

# 🧠 What This Project Demonstrates

* Distributed systems
* Async pipelines
* Queue processing
* Cloud deployments
* System design
* Performance trade-offs
* Real-world debugging

---

# ⭐ Future Roadmap

* Auth based dashboards
* Project management UI
* Role based access
* Event schemas
* Webhook exports
* Clickhouse backend

---

# 📜 License

MIT