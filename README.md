# OrganBay

**A real-time, event-driven coordination platform for hospital organ logistics in India.**

OrganBay lets hospitals (modeled as network nodes) publish organ availability
and recipient need in real time, runs a deterministic rule-based
compatibility check, proposes ranked matches, predicts transport ETA with a
small ML model, and tracks simulated transport live on a map — with a full
audit trail of every action.

> **This is a portfolio/academic project.** It is explicitly **not** a
> clinical tool and must never be used for real organ allocation decisions.
> See [Disclaimers](#disclaimers--scope) below before reading further.

---

## Table of contents

- [Disclaimers & scope](#disclaimers--scope)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Folder structure](#folder-structure)
- [Local setup](#local-setup)
- [Seeding demo data](#seeding-demo-data)
- [API reference](#api-reference)
- [Socket.IO event reference](#socketio-event-reference)
- [Known limitations](#known-limitations--out-of-scope)
- [What you (the developer) need to do](#what-you-the-developer-need-to-do)
- [Deployment](#deployment)


---

## Disclaimers & scope

These are stated here deliberately, up front, and are also repeated as
inline comments/UI tooltips at the exact places in the code where they
matter, so the project defends itself even if someone skips this README.

1. **Compatibility engine.** OrganBay implements a **simplified,
   deterministic, rule-based compatibility engine** using blood-group
   compatibility rules and a representative HLA marker overlap
   calculation, **for demonstration purposes only**. It does not implement
   real histocompatibility testing, crossmatch testing, antigen/antibody
   analysis, or any clinically valid immunological matching. **It is not
   intended for, and must never be used for, real clinical
   decision-making.** Real organ allocation in India involves NOTTO/ROTTO/
   SOTTO coordination, certified laboratory testing, transplant-center
   criteria, and physician judgment — this project does not attempt to
   replicate any of that.
2. **ML scope.** The one trained ML model in this project predicts
   **transport ETA** (a logistics problem) from distance/time-of-day
   features. It makes **no clinical predictions** of any kind — no
   viability scoring, no outcome prediction, no allocation decision.
3. **Synthetic training data.** The ETA model is trained on data we
   **generated ourselves** to simulate realistic Indian road/flight
   transport conditions (see `ml-service/generate_synthetic_data.py`) —
   not on a sourced medical or logistics dataset. This is a deliberate,
   disclosed choice: real transplant logistics data isn't available (and
   shouldn't be, for privacy reasons), and an unrelated proxy dataset
   would be misleading to present as representative.
4. **Fictional hospital network.** All hospital names and the network
   topology are **fictionalized** for demonstration. Geographic
   coordinates correspond to real Indian metro areas (to keep distances
   and ETAs realistic), but no real hospital's name, data, partnership,
   or endorsement is implied.
5. **Not a distributed system**, as discussed above — it's a real-time
   client-server / event-driven architecture.

---

## Architecture

```mermaid
flowchart LR
    subgraph Client["Hospital Clients (React, Vercel)"]
        UI[Dashboard / Matches / Live Map / Emergency Mode]
    end

    subgraph Gateway["Node.js + Express + Socket.IO (Render)"]
        API[REST API]
        WS[Socket.IO Server]
        ENGINE[Compatibility Engine\n(deterministic, rule-based)]
        MATCH[Matching Service]
        SIM[Transport Simulator]
    end

    subgraph MLSvc["FastAPI ML Microservice (Render)"]
        MODEL[GradientBoosting ETA Model]
    end

    DB[(MongoDB Atlas\nmulti-document transactions)]

    UI <-- REST + WebSocket --> API
    UI <-- WebSocket --> WS
    API --> ENGINE
    API --> MATCH
    MATCH -- "POST /predict-eta" --> MODEL
    MATCH --> DB
    SIM --> WS
    API --> DB
    WS -.emits real-time events.-> UI
```

**Event flow for one organ, end to end:**

1. Hospital A lists an organ → written to MongoDB → `organ:new` broadcast
2. Deterministic compatibility engine scores all waiting recipients needing
   that organ type (blood-type gate + HLA marker overlap)
3. Top-ranked candidates get a transport-ETA prediction from the FastAPI ML
   service (with an automatic haversine-based fallback if the ML service is
   unreachable)
4. Proposed `Match` documents are created and pushed to the relevant
   hospitals via Socket.IO room `hospital:{id}`
5. Receiving hospital accepts → a MongoDB **multi-document transaction**
   atomically updates the match, organ, recipient, and creates a `Transport`
   record, rejecting any other competing proposals for the same organ
6. `transportSimulator.js` interpolates position over the predicted ETA,
   emitting `transport:update` events that animate the live map
7. Every step writes to the `AuditLog` collection

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, Leaflet (via react-leaflet), Socket.IO client |
| Backend | Node.js, Express, Socket.IO, Mongoose |
| Database | MongoDB (Atlas free tier), multi-document transactions on critical writes |
| ML microservice | Python, FastAPI, scikit-learn (Gradient Boosting), pandas/numpy |
| Auth | JWT (jsonwebtoken), bcrypt password hashing |
| Maps | Leaflet + OpenStreetMap tiles (no API key / no paid service required) |
| Hosting (all free tier) | Vercel (frontend), Render (backend + ML service), MongoDB Atlas (database) |

**No paid APIs or services are required anywhere in this stack.**

---

## Folder structure

```
organbay/
├── backend/
│   ├── config/db.js
│   ├── models/            # Hospital, Organ, Recipient, Match, Transport, AuditLog, User, EmergencySettings
│   ├── services/
│   │   ├── compatibilityEngine.js   # <- the disclaimer-heavy core logic
│   │   ├── matchingService.js
│   │   ├── mlClient.js              # calls the FastAPI service, with fallback
│   │   └── auditLogger.js
│   ├── controllers/, routes/, middleware/
│   ├── sockets/            # socketHandler.js, transportSimulator.js
│   ├── seed/               # hospitalSeedData.js, seed.js
│   └── server.js
├── ml-service/
│   ├── generate_synthetic_data.py
│   ├── train_model.py
│   ├── main.py             # FastAPI app
│   ├── model/eta_model.joblib   # pre-trained, included
│   └── data/synthetic_transport_data.csv
├── frontend/
│   └── src/{pages,components,context,api,styles}
└── README.md (this file), DEPLOYMENT.md
```

---

## Local setup

You'll need Node.js 18+, Python 3.10+, and a free MongoDB Atlas account
(or a local MongoDB instance) before starting.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # fill in MONGO_URI and JWT_SECRET
npm run seed               # populates hospitals, demo users, sample organs/recipients
npm run dev                 # starts on http://localhost:5000
```

### 2. ML service

```powershell
cd ml-service
python -m venv venv 
venv/Scripts/activate
pip install -r requirements.txt
# model/eta_model.joblib is already included pre-trained, but you can retrain:
#   python generate_synthetic_data.py && python train_model.py
uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                 # starts on http://localhost:5173
```

Open http://localhost:5173 and log in with one of the seeded demo accounts
(see below).

---

## Seeding demo data

`npm run seed` (inside `backend/`) will:

- Insert **20 fictional Indian hospital nodes** across 13 metro areas
- Create one demo login per hospital: `coordinator1@organbay.demo` through
  `coordinator20@organbay.demo`, password **`Demo@1234`** for all of them
  — **`coordinator1@organbay.demo` is an admin** and can toggle Emergency
  Mode; the rest are regular coordinators
- Seed 10 sample available organs and 20 sample waiting recipients with
  Indian-population-weighted blood types and representative HLA markers

⚠️ These are demo credentials for local/portfolio use only — never reuse
this pattern (shared password, no email verification) in anything real.

---

## API reference

All routes are prefixed `/api`. Routes marked 🔒 require
`Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| POST | `/auth/register` | Register a hospital coordinator |
| POST | `/auth/login` | Log in, returns JWT |
| GET | `/hospitals` | List all hospital nodes |
| GET | `/hospitals/:id` | Get one hospital |
| GET | `/organs?status=` | List organs |
| POST 🔒 | `/organs` | List a new organ (triggers matching) |
| GET | `/recipients?status=` | List recipients |
| POST 🔒 | `/recipients` | Register a recipient |
| GET | `/matches?status=` | List matches |
| POST 🔒 | `/matches/:id/accept` | Accept a proposed match (transactional) |
| POST 🔒 | `/matches/:id/reject` | Reject a proposed match |
| GET | `/transports/active` | List all in-transit transports |
| GET | `/transports/by-match/:matchId` | Get transport for a specific match |
| GET | `/emergency` | Get emergency mode status |
| POST 🔒 (admin) | `/emergency/activate` | Turn on emergency mode |
| POST 🔒 (admin) | `/emergency/deactivate` | Turn off emergency mode |
| GET 🔒 | `/audit-logs` | Last 200 audit log entries |

---

## Socket.IO event reference

| Event | Direction | Payload |
|---|---|---|
| `join:hospital` | client → server | `hospitalId` |
| `organ:new` | server → all | new Organ doc |
| `recipient:new` | server → all | new Recipient doc |
| `match:proposed` | server → `hospital:{id}` room | Match doc |
| `match:accepted` / `match:rejected` | server → all | Match doc |
| `transport:started` | server → all | Transport doc |
| `transport:update` | server → all | `{ transportId, matchId, currentLocation, progress, status }` |
| `transport:delivered` | server → all | `{ transportId, matchId }` |
| `emergency:activated` / `emergency:deactivated` | server → all | EmergencySettings doc |

---

## Known limitations / out of scope

- No real GPS/vehicle tracking — transport movement is simulated
  (linear interpolation over predicted ETA)
- No real HLA/crossmatch testing — see disclaimers above
- No integration with NOTTO or any real registry/allocation authority
- Single JWT role model (`coordinator` / `admin`) — no fine-grained RBAC
- No automated test suite included (see "What you need to do" below)
- Free-tier hosting means cold starts — see Deployment section

---

## What you (the developer) need to do

Everything above is built and included in this repo. The following steps
need **your** accounts/actions and can't be done for you:

1. **Create free accounts**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register), [Render](https://render.com), [Vercel](https://vercel.com) — all have functional free tiers, no card required for Atlas/Vercel (Render may ask for card verification on some regions but has a free web service tier).
2. **Push this project to your own GitHub repo** (`git init`, commit, push) — needed for Vercel/Render's auto-deploy-from-GitHub flow.
3. **Create a MongoDB Atlas cluster** (M0 free tier) and get your connection string.
4. **Follow `DEPLOYMENT.md`** to actually deploy all three services and wire up environment variables — this involves clicking through dashboards that only you can access.
5. **Run the seed script** against your deployed (or local) database.
6. **Test the live deployed demo end-to-end** before putting it on your resume.
7. **Optional but recommended**: retrain the ML model yourself and tweak `generate_synthetic_data.py`'s assumptions — being able to explain and defend the synthetic data generation logic in your own words matters more in an interview than the exact numbers.
8. **Write your own reflections** for interview prep — the [Interview talking points](#interview-talking-points) section below is a starting scaffold, not a script to recite verbatim. Make sure you can explain every design decision (transactions, synthetic data, disclaimers) in your own words.
9. **Record a short demo video/GIF** of the deployed app for your resume/portfolio — genuinely worth the 10 minutes.

---

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full step-by-step guide
(Vercel + Render + MongoDB Atlas, all free tier, no paid APIs).

---

## License

MIT — for portfolio/educational use. Not licensed or intended for any real
clinical, medical, or operational deployment.
