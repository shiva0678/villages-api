# Deployment Guide & Strategy

This document outlines the professional deployment workflow for the All India Villages API SaaS platform.

## 1. Vercel Deployment Configuration

The repository is structured as a monorepo for seamless deployment on Vercel.

### Project Structure
```
project-root/
├── api/              # Serverless functions (backend)
├── frontend/         # React dashboard (frontend)
├── prisma/           # Database schema
└── vercel.json       # Deployment configuration
```

### Environment Variables
Set these in the **Vercel Project Settings > Environment Variables**:

| Variable | Purpose |
| :--- | :--- |
| `DATABASE_URL` | NeonDB connection string |
| `REDIS_URL` | Upstash Redis connection string |
| `JWT_SECRET` | Secret key for token signing |
| `NODE_ENV` | Set to `production` |
| `ALLOWED_ORIGINS` | e.g. `https://villageapi.com` |

---

## 2. Database Migration Strategy (Section 12.3)

We use **Prisma Migrate** to manage the schema lifecycle.

### Local Development
When you change `prisma/schema.prisma`:
1. Run `npx prisma migrate dev --name <description>`
2. This creates a migration SQL file and updates your local/dev DB.

### Production Deployments
**NEVER** run `migrate dev` on a production database.
1. Deployments on Vercel automatically run `prisma generate` via the `postinstall` script.
2. For schema changes, run the following manually before/during deployment:
   ```bash
   npx prisma migrate deploy
   ```
   *This applies pending migrations without resetting the database.*

### Migration Safety
- **Transactions**: Prisma migrations run in a transaction. If one step fails, the entire migration rolls back.
- **Backups**: Always perform a NeonDB snapshot before running `migrate deploy` on production.
- **Reversibility**: Keep a `rollback.sql` prepared if a manual migration involves complex data transformation.

---

## 3. Deployment Environments

| Environment | URL | Trigger |
| :--- | :--- | :--- |
| **Preview** | `{pr-number}.vercel.app` | Every Pull Request |
| **Staging** | `staging.villageapi.com` | Merges to `develop` |
| **Production** | `api.villageapi.com` | Merges to `main` |

---

## 4. Troubleshooting
- **Prisma Client not found**: Ensure `npx prisma generate` ran successfully during build.
- **Serverless Timeout**: Vercel functions have a 10s timeout by default (Free) or 30s (Pro). Optimize database queries to stay within these limits.
