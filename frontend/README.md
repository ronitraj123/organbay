# OrganBay Frontend

React + Vite frontend for OrganBay. See the root project README.md for
full context, disclaimers, and deployment instructions.

## Local setup

```bash
npm install
cp .env.example .env.local     # then edit if your backend runs elsewhere
npm run dev
```

Runs at http://localhost:5173 by default. Requires the backend
(`/backend`) and ML service (`/ml-service`) to be running for full
functionality.

## Pages

- **Login** — demo hospital-coordinator accounts (see root README for seeded credentials)
- **Dashboard** — list a new organ / register a new recipient, view current available organs and waiting recipients
- **Matches** — view proposed/accepted/rejected matches, with the compatibility index + ETA breakdown, accept or reject proposed matches
- **Live Map** — hospital nodes plotted on a map of India, with simulated real-time organ transport tracking
- **Emergency Mode** — (admin accounts only) toggle emergency mode, which widens match broadcasting and re-prioritizes by urgency
- **Audit Log** — full trail of every state-changing action in the system
