# 📘 All India Villages API — Complete Project Guide
### For: Shivakumar YC | CSE-AIML 4th Sem | Bluestock Internship
### Purpose: Learn from this + Explain to superiors + Build next project independently

---

> 💡 **How to use this file:**
> - Read **"What is it?"** to understand the concept
> - Read **"Why did we do it this way?"** to understand the decision
> - Read **"How to explain to superior"** to prepare for discussions
> - See **"File location"** to find the actual code

---

## 📑 TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Folder Structure](#2-folder-structure)
3. [Database Design (Prisma Schema)](#3-database-design)
4. [Data Pipeline (Python Scripts)](#4-data-pipeline)
5. [Backend API (Node.js + Express)](#5-backend-api)
6. [Authentication System](#6-authentication-system)
7. [Caching Layer (Redis)](#7-caching-layer)
8. [Rate Limiting](#8-rate-limiting)
9. [Frontend (React + Vite)](#9-frontend)
10. [Deployment (Vercel)](#10-deployment)
11. [Key Concepts Explained Simply](#11-key-concepts)
12. [How to Explain to Your Superior](#12-explain-to-superior)

---

## 1. Project Overview

### What is it?
A **SaaS (Software as a Service)** platform that stores all Indian village-level geographical data and provides it to businesses via a paid API.

### Real-world analogy:
> Think of it like a **library**. We are the library (platform). Other businesses (B2B clients) are the readers. They pay a membership fee (subscription plan) to read books (access data) from our library using their membership card (API key).

### Business model:
| Plan | Requests/Day | Price |
|---|---|---|
| FREE | 100 | ₹0 |
| PREMIUM | 10,000 | Paid |
| PRO | 1,00,000 | Higher |
| UNLIMITED | ∞ | Enterprise |

---

## 2. Folder Structure

```
capestone/
├── backend/              ← Node.js server (the brain)
│   ├── prisma/
│   │   └── schema.prisma ← Database blueprint
│   └── src/
│       ├── config/       ← Connects to DB, Redis
│       ├── controllers/  ← What to do when API is called
│       ├── middleware/   ← Checks before reaching controller
│       ├── routes/       ← URL path definitions
│       ├── services/     ← Business logic
│       └── utils/        ← Helper functions
│
├── frontend/             ← React.js UI (what users see)
│   └── src/
│       ├── pages/admin/  ← Admin dashboard
│       ├── pages/client/ ← B2B client portal
│       └── pages/auth/   ← Login / Register
│
├── data-pipeline/        ← Python scripts (one-time data import)
│   └── scripts/
│       ├── import_data.py  ← Reads XLS files, cleans data
│       └── seed_db.py      ← Inserts data into database
│
└── dataset/              ← Raw government XLS files (30 states)
```

---

## 3. Database Design

### File: `backend/prisma/schema.prisma`

### What is Prisma?
Prisma is an **ORM (Object Relational Mapper)**. Instead of writing raw SQL like:
```sql
SELECT * FROM villages WHERE subdistrict_id = 5;
```
You write JavaScript like:
```js
await prisma.village.findMany({ where: { subDistrictId: 5 } });
```
Prisma converts it to SQL behind the scenes. It also auto-generates TypeScript types.

### What is 3NF (Third Normal Form)?
A rule for organizing database tables to avoid duplicate data.

**Without 3NF (BAD — data repeated everywhere):**
```
| village   | subdistrict | district   | state     |
|-----------|-------------|------------|-----------|
| Lachen    | Chungthang  | North Dist | Sikkim    |
| Lachung   | Chungthang  | North Dist | Sikkim    |
| Shipgyer  | Chungthang  | North Dist | Sikkim    |
```
"Sikkim" repeated 3 times. If you need to fix spelling you change 3 rows.

**With 3NF (GOOD — data stored once):**
```
States:       | 11 | Sikkim    |
Districts:    | 241| North Dist| → refers to Sikkim
SubDistricts: |01547| Chungthang| → refers to North Dist
Villages:     | Lachen, Lachung, Shipgyer | → refer to Chungthang
```
"Sikkim" stored ONCE. Change it in one place, fixed everywhere.

### Tables we built and why:

#### `Country`
```prisma
model Country {
  id    Int    @id @default(autoincrement())
  name  String @unique    // "India"
  code  String @unique    // "IN"
}
```
**Why?** Even though we only have India now, keeping a Country table means in the future we can add Pakistan, Bangladesh etc. without redesigning the whole database. This is called **future-proofing**.

#### `State`
```prisma
model State {
  stateCode  String   // "29" (MDDS code from government)
  name       String   // "KARNATAKA"
  countryId  Int      // points to Country table
}
```
**Why `stateCode`?** The government assigned these codes (MDDS codes). We preserve them so our data matches government records exactly.

#### `District`, `SubDistrict`, `Village`
Same pattern — each stores its code, name, and a FK (foreign key) pointing to its parent.

#### `User`
```prisma
model User {
  email        String   // login email
  passwordHash String   // NEVER store plain password!
  role         Role     // ADMIN or CLIENT
  plan         PlanType // FREE / PREMIUM / PRO / UNLIMITED
}
```
**Why `passwordHash`?** We never store the actual password. We use **bcrypt** to convert "mypassword123" → "$2b$10$xyz..." (unreadable hash). Even if database is hacked, passwords are safe.

#### `ApiKey`
```prisma
model ApiKey {
  key        String  // public key shared with client
  secretHash String  // bcrypt hash of the secret
  isActive   Boolean // can be revoked
}
```
**Why key + secret?** Like a username + password for machines. The client sends both in every API request. We verify them.

#### `UserStateAccess`
```prisma
model UserStateAccess {
  userId  Int  // which user
  stateId Int  // which state they can access
}
```
**Why?** FREE plan users might only get access to 1-2 states. PRO/UNLIMITED get all states. This table controls that.

#### `ApiLog`
```prisma
model ApiLog {
  endpoint       String  // which URL was called
  statusCode     Int     // 200 = success, 401 = unauthorized
  responseTimeMs Int     // how fast we responded
  createdAt      DateTime
}
```
**Why?** For analytics — we can show clients "You made 5,432 calls this month" and show admins "API is responding in 45ms average".

### Indexes — Why they matter:
An index is like a **book's index page**. Without it, the DB scans every row (slow). With it, it jumps directly to the right row (fast).
```prisma
@@index([subDistrictId])  // When you ask "give me all villages in subdistrict X"
@@index([key])             // When API key is verified on every request
@@index([createdAt])       // When showing "calls in last 30 days"
```

### How to explain to superior:
> *"We designed the database in 3NF which eliminates data duplication. We have 9 tables — 5 for geographical hierarchy (Country, State, District, SubDistrict, Village) and 4 for platform management (User, ApiKey, UserStateAccess, ApiLog). We use Prisma ORM for type-safe queries and added strategic indexes on frequently queried columns to achieve sub-100ms response times."*

---

## 4. Data Pipeline

### Files: `data-pipeline/scripts/`

### What is it?
A one-time Python process that reads 30 government XLS files and loads them into our PostgreSQL database.

### Why Python (not Node.js)?
Python has better libraries for Excel/data processing:
- `xlrd` — reads `.xls` files
- `odfpy` — reads `.ods` files (Uttar Pradesh)
- `pandas` — data cleaning, deduplication
- `psycopg2` — connects to PostgreSQL

### The Dataset:
- **Source**: MDDS 2011 Census (Ministry of Drinking Water & Sanitation)
- **Format**: One XLS file per state
- **Columns**: 8 columns per row
  ```
  [StateCode] [StateName] [DistCode] [DistName] [SubDTCode] [SubDTName] [VillCode] [VillageName]
  ```
- **Total rows**: ~4,62,975 across all files

### Special cases handled:
| Issue | State | Solution |
|---|---|---|
| `.ods` format | Uttar Pradesh | Use `odfpy` library |
| Summary rows | All files | Skip rows where VillCode == `000000` |
| Whitespace in names | All files | `.strip()` all strings |
| Header row | All files | Skip row 0 |

### How to explain to superior:
> *"We built a Python ETL pipeline — Extract from 30 government XLS files, Transform by cleaning and deduplicating the data, Load into PostgreSQL. The pipeline handles edge cases like ODS format for UP and summary aggregation rows. Data is inserted in batches of 1000 for performance, with idempotent upserts so it can be re-run safely."*

---

## 5. Backend API

### Files: `backend/src/`

### What is Express.js?
Express is a **web framework for Node.js**. It makes it easy to create API endpoints.

### How a request flows through our backend:
```
Request → middleware (auth, rate-limit, cache) → controller → service → DB → response
```

### Our API routes:

#### Geography Routes (What clients pay for)
```
GET /api/v1/states                          → all states
GET /api/v1/districts?state_code=29         → districts in Karnataka
GET /api/v1/subdistricts?district_code=241  → subdistricts in North District
GET /api/v1/villages?subdistrict_code=01547 → villages in Chungthang
GET /api/v1/search?q=lachen                 → search by name
```

#### Auth Routes
```
POST /api/auth/register  → create B2B account
POST /api/auth/login     → get JWT token
GET  /api/auth/me        → get my profile
```

#### B2B Client Routes
```
GET    /api/b2b/keys          → list my API keys
POST   /api/b2b/keys/generate → generate new key
DELETE /api/b2b/keys/:id       → revoke key
GET    /api/b2b/usage          → my usage stats
```

#### Admin Routes
```
GET   /api/admin/users        → all registered clients
GET   /api/admin/stats        → platform analytics
GET   /api/admin/logs         → API call logs
PATCH /api/admin/users/:id    → update plan/status
```

### Middleware (the security guards):
Each request passes through middleware BEFORE reaching the controller:
1. **CORS** — allows frontend to talk to backend
2. **Rate Limiter** — checks if client exceeded daily limit
3. **Auth Middleware** — verifies JWT or API key
4. **Cache Check** — returns cached data if available
5. **Error Handler** — catches and formats all errors

### How to explain to superior:
> *"We built a RESTful API with Express.js organized in four route groups: geographic data (/api/v1), authentication (/api/auth), B2B client portal (/api/b2b), and admin panel (/api/admin). Each request passes through a middleware chain that handles CORS, rate limiting, authentication, and caching before reaching the controller."*

---

## 6. Authentication System

### Files: `backend/src/middleware/auth.middleware.js`, `backend/src/controllers/auth.controller.js`

### Two types of authentication:

#### 1. JWT (JSON Web Token) — for Dashboard login
**Flow:**
```
User logs in with email + password
→ Server verifies password (bcrypt.compare)
→ Server creates JWT: { userId, role, plan, exp: "7d" }
→ JWT sent to frontend
→ Frontend stores JWT in localStorage
→ Every dashboard request includes: Authorization: Bearer <jwt>
→ Server verifies JWT signature → knows who you are
```

**What is a JWT?** A token with 3 parts:
```
header.payload.signature
eyJhbG..  .eyJ1c2Vy..  .SflKxwR..
```
The payload (middle) contains user data. The signature ensures nobody tampered with it.

#### 2. API Key + Secret — for programmatic API access
**Flow:**
```
Client generates API key from portal
→ Gets: key="VIL_abc123", secret="xyz789"
→ Every API request includes headers:
   X-API-Key: VIL_abc123
   X-API-Secret: xyz789
→ Server looks up key in Redis (fast)
→ Verifies secret with bcrypt.compare
→ Checks rate limit → allows/denies
```

### Why bcrypt?
bcrypt converts passwords into irreversible hashes:
```
"password123" → "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh+y"
```
Even with the hash, you can't get back to "password123". Only way to verify: hash the input again and compare.

### How to explain to superior:
> *"We implement a dual authentication strategy. JWT tokens secure the dashboard UI — stateless, signed with a secret, expire in 7 days. API Key + Secret pairs secure programmatic API access — keys are stored hashed in the database and also cached in Redis for fast lookup. bcrypt is used for all password and secret hashing."*

---

## 7. Caching Layer

### Technology: Redis (Upstash cloud)

### What is Redis?
Redis is an **in-memory database** — data stored in RAM, not disk. Reading from RAM is ~1000x faster than reading from PostgreSQL.

### What we cache:
| Data | Cache Key | TTL (time-to-live) |
|---|---|---|
| All states | `geo:states:all` | 24 hours |
| Districts of a state | `geo:districts:state:29` | 1 hour |
| SubDistricts | `geo:subdistricts:district:241` | 1 hour |
| Villages of subdistrict | `geo:villages:subdistrict:01547` | 1 hour |
| API key validation | `apikey:VIL_abc123` | 5 min |

### Cache flow:
```
Request arrives
→ Check Redis for cached data
→ HIT: return cached data (< 5ms!) ✅
→ MISS: query PostgreSQL (~50ms)
        → store result in Redis
        → return to client
```

### Why Upstash specifically?
Upstash is a **serverless Redis** — no server to manage, pay per request, works perfectly with Vercel's serverless functions.

### How to explain to superior:
> *"We use Upstash Redis as a distributed caching layer. Geographic data is cached with TTL ranging from 1-24 hours since village data rarely changes. API key validations are cached for 5 minutes to reduce database load. This is what enables our sub-100ms response time target for 95% of requests."*

---

## 8. Rate Limiting

### Technology: express-rate-limit + Redis

### What is rate limiting?
Preventing a single client from making too many requests (abuse, overload).

### Our plan-based limits:
```
FREE:      100 requests/day
PREMIUM:  10,000 requests/day
PRO:     100,000 requests/day
UNLIMITED: no limit
```

### How it works:
```
Request with API key arrives
→ Redis key: ratelimit:VIL_abc123:2024-01-15
→ Redis INCR (increment counter)
→ If counter > plan limit → return 429 Too Many Requests
→ Else → allow request, counter++ 
→ Key expires at midnight (daily reset)
```

### Why Redis for rate limiting (not in-memory)?
If we run 3 server instances (for load balancing), an in-memory counter would reset per-instance. Redis is shared across ALL instances — correct global count.

### How to explain to superior:
> *"Rate limiting is implemented using Redis counters with daily TTL. Each API key has a counter incremented on every request, checked against their plan's limit. We use Redis (not in-memory) so the rate limit works correctly even when horizontally scaled across multiple server instances."*

---

## 9. Frontend

### Technology: React.js + Vite

### What is Vite?
Vite is a **build tool** that starts a dev server fast and bundles the React app for production. Much faster than Create React App.

### Pages we built:

#### Auth Pages (`/login`, `/register`)
- Email + password form
- On login success → store JWT in state/localStorage
- Redirect to correct dashboard based on `role`

#### Admin Dashboard (`/admin/*`)
- **Stats page**: Total users, total API calls today, revenue estimate (Recharts bar/line charts)
- **Users page**: Table of all registered B2B clients, ability to change plan
- **Logs page**: Recent API calls with status codes and response times

#### B2B Client Portal (`/portal/*`)
- **Home**: Welcome, show current plan, usage this month
- **API Keys**: Generate key+secret, copy to clipboard, revoke
- **Usage**: Usage graph — calls per day this week (Recharts)

### State management:
- **Auth Context** — stores current user + JWT, shared across all pages
- **React hooks** — `useState`, `useEffect` for local component state
- **Axios/fetch** — for API calls to backend

### How to explain to superior:
> *"The frontend is a React SPA built with Vite for fast development. It has two separate dashboards — Admin (user management, platform analytics) and B2B Client (API key management, usage monitoring). Both use Recharts for data visualization and share an Auth context for JWT management. The frontend calls our own backend REST API."*

---

## 10. Deployment

### Platform: Vercel

### Why Vercel?
- Free tier is generous
- Zero config for React frontends
- Node.js backend runs as **serverless functions** (auto-scales)
- Global CDN — users get fast responses from nearest edge node
- Automatic HTTPS
- GitHub integration — push code = auto deploy

### Serverless functions:
Instead of a long-running Node.js server, Vercel runs our backend as **serverless functions** — each API route is an independent function that starts, processes, and stops. This means:
- No server to maintain
- Auto-scales to zero when no traffic (saves money)
- Auto-scales to millions when traffic spikes

### Environment variables:
All secrets (DB URL, JWT secret, Redis URL) are stored in Vercel's environment settings — never in code.

### How to explain to superior:
> *"We deploy on Vercel using their serverless functions for the Node.js backend and static hosting for the React frontend. The serverless architecture means zero infrastructure management, automatic scaling, and global edge distribution. Environment secrets are managed through Vercel's secure environment variable system, never committed to version control."*

---

## 11. Key Concepts Explained Simply

### What is a REST API?
A way for programs to talk to each other over the internet using standard HTTP methods:
- `GET` — fetch data (like reading a page)
- `POST` — create new data (like submitting a form)
- `PUT/PATCH` — update existing data
- `DELETE` — delete data

### What is SaaS?
Software as a Service — you sell access to software, not the software itself. Examples: Gmail, Spotify, GitHub. Customers pay a subscription, not a one-time purchase.

### What is an ORM?
Object Relational Mapper — a library that lets you work with databases using your programming language instead of SQL. Prisma is our ORM.

### What is a Foreign Key?
A column in one table that points to the primary key of another table. Like a "reference". Village table has `subDistrictId` that points to SubDistrict table — they're "linked".

### What is idempotent?
An operation you can run multiple times safely without side effects. Our data import uses `ON CONFLICT DO NOTHING` — running it twice won't create duplicates.

### What is async logging?
Recording the API log AFTER sending the response — so the client doesn't have to wait for the log to be written. Non-blocking.

---

## 12. How to Explain to Your Superior

### 30-second pitch:
> *"I built a production-grade SaaS API platform for all Indian village-level geographic data. Businesses integrate our API to power their address dropdowns instead of building and maintaining their own databases. We have tiered subscription plans, an admin panel with analytics, and a B2B client portal with API key management. The stack is Node.js + PostgreSQL + React, with Redis caching for sub-100ms response times."*

### If asked "What did YOU specifically build?":
> *"I worked on the data pipeline — writing Python scripts to clean and import 4.6 lakh rows of government Census data from 30 state XLS files into PostgreSQL. I also designed the database schema following 3NF normalization principles and set up the indexing strategy for performance optimization. Additionally, I contributed to the API controllers and helped integrate the frontend usage dashboard with Recharts."*

### If asked "What was the hardest problem?":
> *"The dataset had several edge cases — Uttar Pradesh data was in ODS format instead of XLS, Madhya Pradesh had a corrupted summary sheet, and every file had summary aggregation rows mixed with actual village data. I wrote validation logic to detect and skip these invalid rows while tracking them in an error log for review."*

### If asked "How does the API perform?":
> *"We target sub-100ms for 95% of requests. This is achieved through: 1) Redis caching of geographic data which doesn't change frequently, 2) PostgreSQL indexes on all heavily queried columns, 3) Vercel edge deployment putting the API close to users, and 4) Async logging so log writes don't block the response."*

---

*Last updated: April 2026 | Bluestock Capstone Project*
