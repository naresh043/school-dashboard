# Guru Sri Vidya Mandira API

Node.js 20.19+ is required; the repository was developed with Node 22.21.0. The API is a separate Express/TypeScript service. It requires a reachable MongoDB database and a generated JWT secret before it can start.

## Local setup (Windows / PowerShell)

1. Install MongoDB Community locally and start the MongoDB service, or provision a development database with a trusted MongoDB provider. The example URI uses local MongoDB only.
2. Copy `server/.env.example` to `server/.env`. Do not commit `.env`.
3. Generate a secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` and replace the example `JWT_SECRET`. The application rejects the placeholder value.
4. Install and start the API:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

5. In a second terminal, install and start the frontend:

   ```powershell
   cd client
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

The Vite API URL is public configuration (`VITE_API_BASE_URL`), not a secret. It defaults to `http://localhost:5000/api/v1`. Backend credentials must stay in `server/.env` and must never be given a `VITE_` prefix.

## Seed synthetic development records

Seeding is opt-in, development-only, and restricted to a local `mongodb://` URI. Set `ALLOW_DEMO_SEED=true`, `SEED_HOD_EMAIL` and a unique `SEED_HOD_PASSWORD` of at least 12 characters in `server/.env`, then run:

```powershell
cd server
npm run seed:demo
```

The seed reuses the frontend's synthetic teachers, classes, and students. It uses insert-only upserts and aborts if a non-demo record conflicts; it does not delete records or seed a remote database. It never prints the seed password. No staff account exists until this command succeeds. For production, provision accounts through a reviewed administrative process rather than this demo seed.

## Verify and validate

```powershell
cd server
npm run typecheck
npm run build
npm test
Invoke-RestMethod http://localhost:5000/api/v1/health
```

Health returns HTTP 503 with `DATABASE_UNAVAILABLE` until MongoDB is connected. Other API responses use `{ success, data, message }` or `{ success: false, error }`. All application data routes require a signed-in Head of Department. Login is rate limited; the staff session uses an HTTP-only JWT cookie plus a double-submit CSRF cookie/header for state-changing requests.

Available API groups are `/api/v1/auth`, `/students`, `/classes`, `/teachers`, `/dashboard/summary`, and `/attendance/sessions`. Attendance APIs accept manual statuses only. `method: "face"` is rejected. Phase 1 camera frames remain in the browser and are not sent to this server.

## Deployment

Deploy the API as a persistent Node.js service separately from the Vite static frontend. Configure `MONGODB_URI`, a unique `JWT_SECRET`, `CLIENT_ORIGIN` (comma-separated exact origins), `COOKIE_SECURE=true`, and `NODE_ENV=production` in the backend environment. Use HTTPS for both frontend and API; if they are on different sites, set `COOKIE_SAME_SITE=none` (which requires secure cookies). Set the frontend's `VITE_API_BASE_URL` to the public API `/api/v1` URL and rebuild the frontend. Never publish `.env` or put backend secrets in frontend build variables.

MongoDB transactions are not required for the implemented single-document attendance upsert; unique indexes enforce one session per class/day and one attendance record per student/session. Install/configure MongoDB before expecting database-backed screens or authentication to work.
