# 🚀 RecoverAI — Autonomous Revenue Recovery Agent

<p align="center">

### 🤖 AI-Powered Revenue Recovery & Customer Retention Platform

**💳 Detect Lost Revenue • 🧠 Understand the Cause • 🛡️ Recover Safely • 📈 Grow Revenue**

<br/>

[![Live Demo](https://img.shields.io/badge/🌐_LIVE_DEMO-RecoverAI-00C853?style=for-the-badge)](https://recover-ai-frontend.onrender.com)

</p>

---

## 🌐 🚀 LIVE DEMO

### 🔥 Experience RecoverAI Live

<p align="center">

## 👉 [🌐 OPEN RECOVERAI — LIVE WEBSITE](https://recover-ai-frontend.onrender.com)

</p>

### ⚡ Backend API

👉 https://recover-ai-backend-sv1y.onrender.com/

### 🎨 Frontend Live

👉 https://recover-ai-frontend.onrender.com

---

## 💰 What is RecoverAI?

**RecoverAI** detects revenue at risk from:

💳 **Failed Payments**
🛒 **Abandoned Checkouts**

It uses an **AI Agent 🤖** to recommend a recovery strategy, validates every recommendation against a deterministic **Policy Engine 🛡️**, and **only then executes an authorized action ⚡**.

Every step is logged to an **immutable-style Audit Trail 📜**, while the admin dashboard tracks:

💵 **Recovered Revenue**
📈 **Recovery Rate**
⚡ **Real-Time Recovery Activity**

---

# 🧠 AI → 🛡️ POLICY → ⚡ ACTION → 📜 AUDIT

```text
                 💳 FAILED PAYMENT
                         │
                         ▼
                🛒 ABANDONED CHECKOUT
                         │
                         ▼
                  🔍 DETECTION
                         │
                         ▼
                    🤖 AI AGENT
                         │
              "What should we do?"
                         │
                         ▼
                 🛡️ POLICY ENGINE
                         │
              "Are we allowed to?"
                         │
                  ┌──────┴──────┐
                  │             │
                  ▼             ▼
               ✅ ALLOW      ❌ BLOCK
                  │             │
                  ▼             ▼
              ⚡ ACTION      📜 AUDIT
                  │
                  ▼
               💰 RECOVERY
                  │
                  ▼
               📊 ANALYTICS
```

---

## 🔥 THE CORE IDEA

> ### 🤖 AI recommends.
>
> ### 🛡️ Policy validates.
>
> ### ⚡ Action executes.
>
> ### 📜 Audit records.
>
> ### 💰 Revenue gets recovered.

### 🚨 The AI is NEVER the final authority.

The AI only creates a **recommendation**.

The deterministic **Policy Engine** decides whether that recommendation is allowed to execute.

This separation makes RecoverAI:

**🛡️ Safe • 🔍 Explainable • 📜 Auditable • ⚡ Automated**

---

# 🏗️ ARCHITECTURE

```text
Events
  │
  │ 💳 Failed Payment
  │ 🛒 Abandoned Checkout
  ▼
┌──────────────────────────────┐
│       🔍 DETECTION           │
│                              │
│     Creates RecoveryCase     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        🤖 AI AGENT           │
│                              │
│ • Failure Reason             │
│ • Recoverability Score 0–100 │
│ • Recommended Strategy       │
│ • Plain-English Explanation  │
└──────────────┬───────────────┘
               │
               │ 💡 Recommendation
               ▼
┌──────────────────────────────┐
│     🛡️ POLICY ENGINE         │
│                              │
│ • Max 3 Attempts             │
│ • Cooldown                   │
│ • Stop After Success         │
│ • Respect STOP / Opt-out     │
│ • Reject Unknown Strategies  │
└──────────────┬───────────────┘
               │
          ┌────┴────┐
          ▼         ▼
       ✅ ALLOW   ❌ BLOCK
          │         │
          ▼         ▼
┌────────────────┐ 📜 AUDIT
│ ⚡ ACTION       │
│    ENGINE       │
│                │
│ • Retry        │
│ • Reminder     │
│ • Recovery Link│
│ • No-op        │
└───────┬────────┘
        │
        ▼
   📜 AUDIT SYSTEM
```

---

# 🛡️ POLICY ENGINE

### 🔒 Deterministic Safety Layer

RecoverAI uses hard-coded rules to make sure AI recommendations stay within safe business boundaries.

| 🛡️ Rule                | ⚙️ Policy                                     |
| ----------------------- | --------------------------------------------- |
| 🔁 **Maximum Attempts** | Maximum **3 recovery attempts**               |
| ⏳ **Cooldown**          | **60 minutes** between contact attempts       |
| 🛑 **After Success**    | Stop all further recovery actions             |
| 🚫 **STOP / Opt-Out**   | Permanent — customer is never contacted again |
| 🔐 **Unknown Strategy** | Automatically rejected                        |

> 📜 **Every ALLOW or BLOCK decision is recorded with a plain-English reason.**

---

# 📜 IMMUTABLE-STYLE AUDIT TRAIL

Every important step is recorded:

```text
🕐 Timestamp
      ↓
🆔 Recovery Case
      ↓
🤖 AI Recommendation
      ↓
🛡️ Policy Decision
      ↓
💬 Explanation
      ↓
⚡ Execution Result
```

So a human reviewer can always understand:

> 🔍 **"Why did the system do this?"**

or

> 🛑 **"Why didn't the system do this?"**

---

# 📊 REAL-TIME ADMIN DASHBOARD

RecoverAI tracks:

### 💰 Revenue at Risk

Potential revenue affected by failed payments and abandoned checkouts.

### 💵 Revenue Recovered

Revenue successfully recovered through the pipeline.

### 📈 Recovery Rate

Measures recovery performance in real time.

### 📊 Strategy Performance

Shows which recovery strategies perform best.

### 🚦 Case Status

```text
🟢 ACTIVE
🟡 IN PROGRESS
🔵 RECOVERED
🔴 STOPPED
```

---

# 🧰 TECH STACK

| Layer             | Technology                                    |
| ----------------- | --------------------------------------------- |
| 🎨 **Frontend**   | React 18 + Vite + Tailwind CSS + Recharts     |
| ⚙️ **Backend**    | Python 3.10+ + FastAPI + SQLAlchemy           |
| 🗄️ **Database**  | SQLite — PostgreSQL Ready                     |
| 🧪 **Simulation** | Synthetic Transaction Generator — 120+ events |

---

# 📂 BACKEND MODULES

```text
backend/app/
│
├── 🚀 main.py
│
├── 🗄️ database.py
│
├── 📦 models.py
│
├── 📋 schemas.py
│
├── 🧪 simulation.py
│
├── 🌐 routers/
│   ├── events.py
│   ├── cases.py
│   ├── analytics.py
│   └── audit.py
│
└── 🧠 services/
    ├── ai_agent.py
    ├── policy_engine.py
    ├── action_engine.py
    └── audit_service.py
```

---

# 🚀 SETUP & RUN LOCALLY

## 📋 Prerequisites

* 🐍 Python 3.10+
* 🟢 Node.js 18+

---

## 🔐 Google OAuth Setup

The app is gated behind **Google Sign-In 🔑**.

Create a Google OAuth 2.0 **Web Application** client and configure the required authorized JavaScript origins.

The generated **Client ID** is required in:

```text
backend/.env
frontend/.env
```

---

## ⚙️ Backend

```bash
cd backend

python3 -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env

uvicorn app.main:app --reload --port 8000
```

### 📊 Auto-Seed

On first startup:

```text
🗄️ SQLite Database Created
        ↓
🧪 120 Synthetic Transactions
        ↓
💳 Successful + Failed Payments
        ↓
🛒 Abandoned Checkouts
        ↓
🤖 Recovery Pipeline
        ↓
📊 Dashboard Ready
```

### 📚 API Documentation

👉 `http://localhost:8000/docs`

---

# 🎨 FRONTEND

```bash
cd frontend

npm install

npm run dev
```

### 🌐 Local Application

👉 `http://localhost:5173`

### 🔗 Backend Configuration

```env
VITE_API_URL=http://localhost:8000
```

---

# 🐘 POSTGRESQL READY

RecoverAI can be switched from SQLite to PostgreSQL using:

```bash
DATABASE_URL="postgresql+psycopg2://user:password@localhost:5432/recoverai"
```

No application code changes are required.

---

# 🌐 API REFERENCE

| Method  | Endpoint                                | Description                  |
| ------- | --------------------------------------- | ---------------------------- |
| 🟢 POST | `/events/payment`                       | Ingest payment event         |
| 🟢 POST | `/events/checkout`                      | Ingest abandoned checkout    |
| 🔵 GET  | `/recovery-cases`                       | List recovery cases          |
| 🔵 GET  | `/recovery-cases/{id}`                  | Full case + audit timeline   |
| 🟢 POST | `/recovery-cases/{id}/process`          | AI → Policy → Action → Audit |
| 🟢 POST | `/recovery-cases/{id}/simulate-success` | Simulate successful recovery |
| 🟢 POST | `/recovery-cases/{id}/opt-out`          | Customer STOP / opt-out      |
| 🔵 GET  | `/analytics/dashboard`                  | Revenue & recovery analytics |
| 🔵 GET  | `/audit-logs`                           | Complete audit trail         |
| 🟢 POST | `/simulation/generate?count=60`         | Generate synthetic events    |

---

# 🎬 3–5 MINUTE DEMO

```text
        🚀 OPEN LIVE DEMO
                │
                ▼
        📊 DASHBOARD
                │
                ▼
       📁 RECOVERY CASE
                │
                ▼
      ⚡ RUN RECOVERY PIPELINE
                │
        ┌───────┴────────┐
        ▼                ▼
     🤖 AI             🛡️ POLICY
        │                │
        └───────┬────────┘
                ▼
          ⚡ ACTION
                │
                ▼
          📜 AUDIT
                │
                ▼
        💰 SIMULATE SUCCESS
                │
                ▼
          📈 RECOVERY RATE ↑
```

### 🛑 Safety Demo

```text
🚫 OPT OUT (STOP)
        ↓
🤖 AI recommends action
        ↓
🛡️ POLICY ENGINE
        ↓
❌ BLOCKED
        ↓
📜 REASON LOGGED
```

> 🔥 **This demonstrates that AI cannot override a hard policy rule.**

---

# 🇮🇳 MARKET INTELLIGENCE

RecoverAI also includes a separate analytics explorer containing:

## 🏢 5,000 Indian Companies

The dataset includes:

🏢 Company Name
🏭 Industry
📍 City
🗺️ State
📅 Founded Year
👥 Employees
💰 FY2024–25 Revenue
💰 FY2025–26 Revenue
📈 Growth %
💵 Profit
📊 Margin %
⚖️ Debt-to-Equity
🌍 Export Share
📈 Market Cap

All financial values are represented in **₹ Crore**.

---

# 📈 MARKET ANALYTICS

### 📊 KPI CARDS

💼 Companies
💰 Total Revenue
💵 Total Profit
📈 Average Growth

### 📉 CHARTS

🏭 Revenue by Industry
🗺️ Revenue by State
🏆 Top 12 Companies by Revenue
🏛️ Listed vs Private Revenue
📈 Revenue Growth Distribution
🫧 Profit Margin vs Growth

### 🔎 FILTERS

🏭 Industry
📍 State
🏛️ Listing Status
🔍 Live Search

### 📥 EXPORT

**Export Filtered CSV**

---

# 🎯 DEMO STORY

```text
💳 PAYMENT FAILS
       ↓
🔍 RECOVERAI DETECTS IT
       ↓
🤖 AI UNDERSTANDS WHY
       ↓
💡 AI RECOMMENDS A STRATEGY
       ↓
🛡️ POLICY ENGINE CHECKS IT
       ↓
      ┌───────┐
      │       │
      ▼       ▼
    ✅ YES   ❌ NO
      │       │
      ▼       ▼
   ⚡ ACT   🚫 BLOCK
      │       │
      └───┬───┘
          ▼
      📜 AUDIT
          │
          ▼
      📊 ANALYTICS
          │
          ▼
      💰 RECOVERED
```

---

# 🚧 DESIGN SCOPE

RecoverAI is a focused **MVP**, not a complete payments platform.

Currently out of scope by design:

❌ Real Payment Gateway Integration
❌ Real Email/SMS Delivery
❌ User Authentication
❌ Multi-Tenant Merchant Accounts

The **Action Engine** is structured so these capabilities can be plugged in later without changing the:

🤖 **AI Agent**
🛡️ **Policy Engine**
📜 **Audit System**

---

# 🏆 BUILT FOR HACKATHON. DESIGNED FOR SCALE.

### 💡 RecoverAI turns:

**Failed Payments + Abandoned Checkouts**

into:

**🤖 AI Recommendations + 🛡️ Safe Automation + 📜 Full Auditability + 💰 Recovered Revenue**

---

<p align="center">

# 🚀 RECOVERAI

### 💰 Don't just detect lost revenue. Recover it intelligently.

**🤖 Think → 🛡️ Verify → ⚡ Act → 📜 Audit → 📈 Recover**

<br/>

### 🌐 [🔥 LIVE DEMO — OPEN RECOVERAI](https://recover-ai-frontend.onrender.com)

</p>
