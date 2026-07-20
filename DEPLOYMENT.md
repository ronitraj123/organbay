# Deploying OrganBay (100% free tier, no paid APIs)

This deploys three services (frontend, backend, ML service) plus a
database, using only free tiers: **Vercel** + **Render** (×2) +
**MongoDB Atlas**. Total cost: ₹0.

You'll need: a GitHub account with this project pushed to a repo, and
free accounts on the three platforms below.

---

## 0. Push this project to GitHub

```bash
cd organbay
git init
git add .
git commit -m "Initial commit: OrganBay"
# create a new empty repo on github.com first, then:
git remote add origin https://github.com/<your-username>/organbay.git
git branch -M main
git push -u origin main
```

Make sure `.gitignore` is excluding `node_modules/`, `.env`, and
`venv/` (already set up in this repo — double check before pushing).

---

## 1. MongoDB Atlas (database)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a new **free M0 cluster** (any region — pick one close to India, e.g. Mumbai `ap-south-1`, if offered).
3. Under **Database Access**, create a database user with a username/password (save these).
4. Under **Network Access**, add IP `0.0.0.0/0` (allow from anywhere) — acceptable for a demo project, not for real production data.
5. Click **Connect → Drivers**, copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
6. Add `organbay` as the database name before the `?`:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/organbay?retryWrites=true&w=majority
   ```
   Save this — it's your `MONGO_URI`.

**Note on transactions:** M0 clusters run as a replica set, so
`mongoose`'s multi-document transactions (used in `acceptMatch`) work
fine on the free tier — no special configuration needed.

---

## 2. ML microservice (Render, Python)

1. Go to https://render.com and sign up (GitHub login is easiest).
2. **New → Web Service** → connect your GitHub repo → select the `ml-service` folder as the **Root Directory**.
3. Settings:
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance type**: Free
4. Deploy. Note the resulting URL, e.g. `https://organbay-ml.onrender.com`.
5. Test it: `curl https://organbay-ml.onrender.com/health`

---

## 3. Backend (Render, Node)

1. On Render: **New → Web Service** → same repo → Root Directory: `backend`.
2. Settings:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance type**: Free
3. Add environment variables (Render dashboard → Environment):
   ```
   MONGO_URI=<your Atlas connection string>
   JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
   ML_SERVICE_URL=<your ml-service Render URL from step 2>
   CORS_ORIGIN=<your Vercel frontend URL — add this after step 4, then redeploy>
   PORT=5000
   ```
4. Deploy. Note the URL, e.g. `https://organbay-backend.onrender.com`.
5. Run the seed script **once**, against your deployed database:
   - Easiest: run it locally with `MONGO_URI` in your local `.env` pointed at Atlas: `cd backend && npm run seed`.

---

## 4. Frontend (Vercel)

1. Go to https://vercel.com and sign up (GitHub login).
2. **Add New → Project** → import your repo → set **Root Directory** to `frontend`.
3. Framework preset: Vite (auto-detected).
4. Add environment variables:
   ```
   VITE_API_URL=<your backend Render URL from step 3>
   VITE_SOCKET_URL=<same backend Render URL>
   ```
5. Deploy. Note your live URL, e.g. `https://organbay.vercel.app`.
6. **Go back to the backend's Render environment variables** and set `CORS_ORIGIN` to this Vercel URL, then trigger a redeploy of the backend so CORS + Socket.IO accept requests from your live frontend.

---

## 5. Handling Render free-tier cold starts

Render's free web services spin down after ~15 minutes of inactivity.
The first request after idle time can take 30–60 seconds. Two options:

- **Do nothing, but set expectations**: mention it in your demo ("first
  load may take a moment, it's on a free-tier server").
- **Keep it warm**: use a free cron service like https://cron-job.org
  to ping `https://<your-backend>.onrender.com/health` and
  `https://<your-ml-service>.onrender.com/health` every 10 minutes.

---

## 6. Final checklist before sharing the live link

- [ ] Log in with a seeded demo account on the live frontend
- [ ] List an organ from the Dashboard, confirm matches appear on the Matches page
- [ ] Accept a match, confirm it shows up moving on the Live Map
- [ ] Toggle Emergency Mode from an admin account, confirm the banner appears
- [ ] Check the Audit Log page shows recent actions
- [ ] Open browser dev tools → Network tab, confirm no CORS errors
- [ ] Share the Vercel URL — not the Render backend URL directly
