# RecoverAI — Autonomous Revenue Recovery Agent

RecoverAI detects revenue at risk from **failed payments** and **abandoned checkouts**,
uses an AI agent to recommend a recovery strategy, validates every recommendation
against a deterministic **Policy Engine**, and only then executes an action —
logging every step to an immutable-style **Audit Trail**. An admin dashboard
tracks recovered revenue and recovery rate in real time.

> Built as a hackathon MVP: functional end-to-end, cleanly modular, and demoable in 3–5 minutes.

---

## 1. Architecture

```
                 ┌──────────────┐
  Events   ───►  │  Detection   │  (failed payment / abandoned checkout → RecoveryCase)
 (webhook/API)    └──────┬───────┘
                         │
                         ▼
                 ┌──────────────┐
                 │  AI Agent    │  → failure_reason, recoverability_score (0-100),
                 │ (recommends) │     recommended_strategy, plain-English explanation
                 └──────┬───────┘
                         │ recommendation (never executes anything)
                         ▼
                 ┌──────────────┐
                 │Policy Engine │  → deterministic rules: max 3 attempts, cooldown,
                 │ (validates)  │     stop after success, respect opt-out/STOP
                 └──────┬───────┘
                         │ allow / block + reason
                         ▼
                 ┌──────────────┐
                 │Action Engine │  → executes the authorized strategy only
                 │ (executes)   │     (retry, reminder, recovery link, or no-op)
                 └──────┬───────┘
                         │
                         ▼
                 ┌──────────────┐
                 │ Audit System │  → immutable-style log: timestamp, case, AI rec,
                 │  (records)   │     policy decision, explanation, execution result
                 └──────────────┘
```

**Why this separation matters:** the AI never touches money or sends messages
directly. It only produces a *recommendation object*. The Policy Engine is a
plain, deterministic rules module — no ML, no ambiguity — that is the sole
authority allowed to approve or block an action. This makes the system safe,
explainable, and auditable, which is exactly what you want next to real payment
flows.

### Tech stack

| Layer      | Technology                                   |
|------------|-----------------------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS + Recharts     |
| Backend    | Python 3.10+ + FastAPI + SQLAlchemy           |
| Database   | SQLite (MVP) — swappable to PostgreSQL via env var, zero code changes |
| Simulation | Built-in synthetic transaction generator (120+ events) |

### Backend module layout

```
backend/app/
├── main.py                # FastAPI app, CORS, startup/auto-seed
├── database.py            # DB engine/session (SQLite now, Postgres-ready)
├── models.py               # SQLAlchemy models: RawEvent, RecoveryCase, AuditLog
├── schemas.py              # Pydantic request/response contracts
├── simulation.py           # Synthetic transaction batch generator
├── routers/
│   ├── events.py           # POST /events/payment, /events/checkout
│   ├── cases.py             # GET/POST /recovery-cases...
│   ├── analytics.py         # GET /analytics/dashboard
│   └── audit.py             # GET /audit-logs
└── services/
    ├── ai_agent.py          # Recommends: failure_reason, score, strategy
    ├── policy_engine.py     # Validates: the ONLY component that can approve an action
    ├── action_engine.py     # Executes: performs the authorized action (simulated)
    └── audit_service.py     # Append-only audit log writer
```

---

## 2. Setup & running locally

### Prerequisites
- Python 3.10+
- Node.js 18+

### 0. Google OAuth setup (one-time)

The app is gated behind Google Sign-In. Create a Google OAuth 2.0 **Web
application** client:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth client ID of type **Web application**.
3. Add authorized JavaScript origins for wherever the frontend runs, e.g.
   `http://localhost:5173`.
4. Copy the generated **Client ID** — you'll need it in both `backend/.env`
   and `frontend/.env` below. No client secret is needed (only the ID token
   flow is used).

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then fill in GOOGLE_CLIENT_ID and JWT_SECRET
uvicorn app.main:app --reload --port 8000
```

On first startup the app automatically creates the SQLite database
(`recoverai.db`) and seeds it with **120 synthetic transactions** (a mix of
successful payments, temporary/permanent failures, and abandoned checkouts),
most of which are pre-processed through the full pipeline so the dashboard
shows meaningful numbers immediately.

API docs (interactive Swagger UI) are available at: **http://localhost:8000/docs**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit **http://localhost:5173**. The frontend talks to the backend at
`http://localhost:8000` by default (override with a `.env` file setting
`VITE_API_URL`).

### Switching to PostgreSQL later

```bash
export DATABASE_URL="postgresql+psycopg2://user:password@localhost:5432/recoverai"
```
No application code changes are required — `app/database.py` reads this
environment variable directly, and `pip install psycopg2-binary` is the only
extra dependency needed.

---

## 3. API reference

| Method | Endpoint                                    | Description |
|--------|----------------------------------------------|--------------|
| POST   | `/events/payment`                            | Ingest a payment event (`status: succeeded\|failed`). Failed payments open a RecoveryCase. |
| POST   | `/events/checkout`                           | Ingest a checkout-abandonment event. Opens a RecoveryCase. |
| GET    | `/recovery-cases`                            | List cases. Filter with `?status=` and `?event_type=`. |
| GET    | `/recovery-cases/{id}`                       | Full case detail, including the audit-log timeline. |
| POST   | `/recovery-cases/{id}/process`               | Run one AI → Policy → Action → Audit cycle on the case. |
| POST   | `/recovery-cases/{id}/simulate-success`      | Demo helper: mark the case as recovered (payment succeeded). |
| POST   | `/recovery-cases/{id}/opt-out`               | Mark the customer as opted out (STOP); blocks all future contact. |
| GET    | `/analytics/dashboard`                       | Aggregate metrics: revenue at risk/recovered, recovery rate, strategy performance. |
| GET    | `/audit-logs`                                | Full audit trail. Filter with `?case_id=`. |
| POST   | `/simulation/generate?count=60`              | Generate another batch of synthetic transactions. |

### Example: submitting a failed payment event

```bash
curl -X POST http://localhost:8000/events/payment \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Jordan Lee",
    "customer_email": "jordan@example.com",
    "amount": 149.99,
    "status": "failed",
    "failure_code": "insufficient_funds"
  }'
```

This immediately opens a `RecoveryCase`. Calling
`POST /recovery-cases/{id}/process` then runs it through the AI agent and
Policy Engine, returning the updated case plus the new audit-log entry.

---

## 4. Policy Engine rules (hard-coded, deterministic)

1. **Maximum 3 recovery attempts** per case.
2. **Cooldown of 60 minutes** required between contact attempts.
3. **Immediate stop** once a case is marked recovered — no further action is ever permitted.
4. **STOP / opt-out is permanent** — a customer who opts out is never contacted again, regardless of what the AI recommends.
5. **Unrecognized strategies are rejected** as a defense-in-depth check against malformed AI output.

Every decision — allowed or blocked — is written to the audit trail with a
plain-English reason, so a human reviewer can always answer "why did (or
didn't) the system do that?"

---

## 5. Demo workflow (3–5 minutes)

1. **Dashboard** — open the app. It's pre-seeded with ~120 transactions, so
   you immediately see Revenue at Risk, Revenue Recovered, Recovery Rate, and
   active/stopped case counts, plus a chart of at-risk vs. recovered revenue
   over time and a strategy-performance table.
2. **Recovery Cases** — filter to `status=open` to find untouched cases. Click
   one to open its detail page.
3. **Case Details** — click **"Run Recovery Pipeline."** Watch the AI classify
   the failure reason, assign a recoverability score, and recommend a
   strategy; the Policy Engine's decision and the Action Engine's simulated
   execution appear immediately in the timeline below.
4. Click **"Simulate Success"** on an in-progress case to show revenue being
   recovered — watch the Dashboard's Recovery Rate move.
5. Click **"Opt Out (STOP)"** on another case, then try **"Run Recovery
   Pipeline"** again — the Policy Engine blocks it and logs why, demonstrating
   that the AI cannot override a hard policy rule.
6. **Audit Trail** — show the full, timestamped log of every AI
   recommendation and policy decision system-wide.
7. **Analytics** — show attempts vs. recoveries by strategy and the case
   status breakdown to round out the story: which strategies actually work.
8. **Market Intelligence** — a second, independent dataset explorer (5,000
   Indian companies) living in the same app, useful to show breadth of the
   team's data-viz work without leaving the demo.

---

## 6. Market Intelligence page

`frontend/src/pages/MarketIntelligence.jsx` is a self-contained analytics view
unrelated to the recovery workflow. It ships with a static dataset embedded at
`frontend/src/data/indianCompanies.json` (5,000 rows: company name, industry,
city, state, founded year, status, employees, FY2024-25 and FY2025-26 revenue,
growth %, profit, margin %, debt-to-equity, export share, and market cap — all
in ₹ Crore). Everything is computed client-side with Recharts, matching the
same dark fintech design system as the rest of the app:

- 4 KPI cards (companies, total revenue, total profit, average growth) that
  recompute live as filters change
- Charts: revenue by industry, revenue by state, top 12 companies by revenue,
  Listed vs. Private revenue split, revenue-growth distribution, and a
  profit-margin-vs-growth bubble scatter sized by market cap
- Filters for industry, state, and listing status, plus a live search box
- A sortable, paginated company table with a "Export filtered CSV" button

No backend involvement is required for this page — it's pure frontend, so it
works even if the FastAPI server isn't running.

---

## 7. Design notes / what was intentionally left out

This is a focused MVP, not a payments platform. Notably out of scope by
design: real payment gateway integration, real email/SMS delivery, user
authentication, and multi-tenant merchant accounts. The Action Engine module
is structured so any of these could be plugged in later (e.g. swap the
simulated Stripe retry call for a real one) without touching the AI Agent,
Policy Engine, or Audit System.
