# 🛰️ Villages API: Total Deployment Master Guide

If you are seeing this, it means you have successfully reached the final stage! This guide will walk you through exactly how to take your project from your local computer to the live internet using **Vercel**, **NeonDB**, and **Upstash**.

---

## 🏗️ Phase 1: The Infrastructure
Before you start, make sure you have created accounts on these three platforms (all have free tiers):
1. **[Vercel](https://vercel.com)**: To host your Frontend (Dashboard) and Backend (API).
2. **[Neon Console](https://console.neon.tech)**: To host your PostgreSQL database.
3. **[Upstash](https://upstash.com)**: For your Redis cache (Rate Limiting).

---

## 📦 Phase 2: Code Submission
Ensure all your latest local changes are on GitHub:
1. Open your terminal in the root folder and run:
   ```bash
   git push origin main
   ```

---

## 🌐 Phase 3: Vercel Project Setup
1. In your **Vercel Dashboard**, click **"Add New... > Project"**.
2. **Import** your `villages-api` repository from GitHub.
3. **Configuration Settings**:
   - **Framework Preset**: Vercel will auto-detect "Other" or "Vite". Leave it as detected.
   - **Root Directory**: Leave it as `./` (Project Root).
4. **Environment Variables**:
   Go to the "Environment Variables" section and **Add** these from your `.env`:
   - `DATABASE_URL`: (Copy from NeonDB)
   - `REDIS_URL`: (Copy from Upstash)
   - `JWT_SECRET`: (Any random safe string)
   - `NODE_ENV`: `production`
   - `ADMIN_EMAIL`: `admin@villagesapi.com`
   - `ADMIN_PASSWORD_HASH`: (A bcrypt hash of your admin password)
5. Click **Deploy**. Vercel will build your React app and Serverless API together.

---

## 🗄️ Phase 4: Production Database Sync
Even though your code is on Vercel, your live database (Neon) is still empty.
1. Update your local `.env` with the **Neon Production DATABASE_URL**.
2. Run this command one time from your terminal:
   ```bash
   npx prisma migrate deploy
   ```
   > [!IMPORTANT]
   > Use `migrate deploy` for production. It is the safe way to create tables on a live database without risk of resetting data.

---

## 📊 Phase 5: Importing the Village Data
Now you need to populate the 5.6 lakh village records into the live database.
1. Go to the `data-pipeline/` directory.
2. Ensure you have the Neon database URL in your `data-pipeline/.env` as well.
3. Run the import script:
   ```bash
   python scripts/import_data.py
   ```
   *This will take about 10-15 minutes. Once it finishes, your API is fully data-ready!*

---

## ✅ Phase 6: Final Verification
1. Visit your Vercel URL (e.g., `https://village-api.vercel.app/health`).
2. You should see `{"status":"ok"}`.
3. Log in to your **Admin Dashboard** on the live URL.
4. **Congratulations! Your B2B SaaS platform is officially LIVE!** 🚀

---

## 📁 Key File Map
- **API Logic**: `api/index.js`
- **Dashboard**: `frontend/src/`
- **Database Schema**: `prisma/schema.prisma`
- **Vercel Config**: `vercel.json`

Check back here whenever you need a reminder of the deployment steps!
