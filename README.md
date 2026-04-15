# 🇮🇳 All India Villages API — Bluestock Capstone

> A production-grade SaaS platform providing comprehensive REST API for India's complete village-level geographical data.

## 📁 Project Structure

```
capestone/
├── backend/              # Node.js + Express API
│   ├── prisma/           # Database schema & migrations
│   └── src/
│       ├── config/       # DB, Redis, env config
│       ├── controllers/  # Route logic
│       ├── middleware/   # Auth, rate-limit, error handlers
│       ├── routes/       # API route definitions
│       ├── services/     # Business logic
│       └── utils/        # Helpers
├── frontend/             # React.js + Vite
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/
│       │   ├── admin/    # Admin dashboard
│       │   ├── client/   # B2B client portal
│       │   └── auth/     # Login / Register
│       ├── services/     # API call functions
│       ├── hooks/        # Custom React hooks
│       ├── context/      # Auth context
│       └── utils/
├── data-pipeline/        # Python scripts for data import
│   ├── scripts/
│   └── output/
├── dataset/              # Raw XLS files (MDDS 2011)
└── docs/                 # Documentation
```

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express.js |
| Database | NeonDB (PostgreSQL) |
| ORM | Prisma |
| Frontend | React.js + Vite |
| Charts | Recharts |
| Cache | Redis (Upstash) |
| Rate Limiting | express-rate-limit + Redis |
| Auth | JWT + bcrypt |
| Hosting | Vercel |

## 🚀 Getting Started

### Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Data Pipeline
```bash
cd data-pipeline
pip install -r requirements.txt
python scripts/import_data.py
```

## 📊 Data Coverage
- **30 States / UTs** from MDDS 2011 Census dataset
- **~4,63,000** geographical entries
- Hierarchy: Country → State → District → Sub-District → Village

## 👤 Author
Shivakumar YC | CSE-AIML 4th Sem | Data Analyst Intern @ Bluestock
