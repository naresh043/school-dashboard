# Guru Sri Vidya Mandira API

Node.js 20.19+ is required; the repository was developed with Node 22.21.0. The API is a separate Express/TypeScript service. It requires a reachable MongoDB database and a generated JWT secret before it can start.

## Local setup (Windows / PowerShell)

1. Install MongoDB Community locally and start the MongoDB service, or provision a development database with a trusted MongoDB provider. The example URI uses local MongoDB only.
2. If `server/.env` does not exist, copy `server/.env.example` to `server/.env`. If it already exists, preserve its existing settings and set only `RECOGNITION_SERVICE_URL=http://127.0.0.1:8001` for the local recognition adapter. Do not commit `.env`.
3. Replace the example `JWT_SECRET` with a generated secret; the application rejects the placeholder. Set `RECOGNITION_SERVICE_SECRET` to a separate generated value (at least 32 characters), and provide that same value to the Python process environment without printing it. Keep the example model ID/version at `unconfigured` until an authorized model is integrated; readiness stays unavailable until model ID/version and a valid `FACE_TEMPLATE_KEY` are configured.
4. In a separate PowerShell terminal, activate the recognition service virtual environment, provide the same `RECOGNITION_SERVICE_SECRET` used by Node through your local secret manager/environment, then start the service on loopback:

   ```powershell
   cd recognition-service
   .\.venv\Scripts\Activate.ps1
   python -m uvicorn app:app --reload --host 127.0.0.1 --port 8001
   ```

   The Python process reads the secret from its own environment; it does not load `server/.env`. Do not print or commit the secret. The service is loopback-bound and must not be exposed publicly.

5. Install and start the API:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

6. In a second terminal, install and start the frontend:

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

Python service HTTP tests (run from `recognition-service` with its virtual environment active; install the test-only client dependency once):

```powershell
python -m pip install -r requirements-test.txt
python -m unittest -v test_service.py
```

Backend tests run with `npm test` from `server/`.

Health returns HTTP 503 with `DATABASE_UNAVAILABLE` until MongoDB is connected. Other API responses use `{ success, data, message }` or `{ success: false, error }`. All application data routes require a signed-in Head of Department. Login is rate limited; the staff session uses an HTTP-only JWT cookie plus a double-submit CSRF cookie/header for state-changing requests.

Available API groups are `/api/v1/auth`, `/students`, `/classes`, `/teachers`, `/dashboard/summary`, `/attendance/sessions`, and the face-recognition routes. Attendance APIs accept manual statuses only. `method: "face"` is rejected and identity results never write attendance. Face detection stays in the browser. The Phase 3 capture buttons send a single frame through the authenticated Node API only after explicit action; the current unconfigured model adapter refuses enrollment and recognition and retains no frames.

Phase 3 adds `PUT /api/v1/students/:studentId/face-authorization`, `GET /api/v1/students/:studentId/face-enrollment`, `POST /api/v1/students/:studentId/face-enrollments`, `DELETE /api/v1/students/:studentId/face-enrollment`, `POST /api/v1/face-recognition/identify`, and authenticated `GET /api/v1/face-recognition/health`. All require the current HOD role, strict payload schemas, and image request rate limits. An authorization reference is an opaque pointer to a separately approved record; the app does not establish consent. `face-enrollments` is a separate collection. Embeddings are AES-256-GCM encrypted with a server-only 32-byte key. Revocation disables authorization and deletes the current template; backups may retain deleted data until their configured expiry.

The private recognition adapter is in `recognition-service/` and listens on `127.0.0.1:8001` for local development. Node connects using `RECOGNITION_SERVICE_URL`; the checked-in example uses `http://127.0.0.1:8001`. With a valid shared internal token, `GET /v1/health` returns HTTP 200 with `ready:false`; `POST /v1/embedding` returns HTTP 503 for a valid image, HTTP 400 for invalid image data, and HTTP 401 for missing/invalid internal authentication. `/docs`, `/openapi.json`, and `/` are intentionally not registered. The adapter remains unavailable until a properly licensed model is integrated; it never returns embeddings, identities, or attendance results. See its README for privacy, evaluation, spoofing limitations, and setup. Production requires an authorized model, internal HTTPS service URL and secret, model ID/version, encrypted-template key, and an explicitly supplied evaluation-derived threshold. The service must remain private and network-restricted; the browser must never call it directly.

## Deployment

Deploy the API as a persistent Node.js service separately from the Vite static frontend. Configure `MONGODB_URI`, a unique `JWT_SECRET`, `CLIENT_ORIGIN` (comma-separated exact origins), `COOKIE_SECURE=true`, and `NODE_ENV=production` in the backend environment. If enabling Phase 3, production validation additionally requires `RECOGNITION_SERVICE_URL` (HTTPS), `RECOGNITION_SERVICE_SECRET`, licensed `RECOGNITION_MODEL_ID` and `RECOGNITION_MODEL_VERSION`, `FACE_TEMPLATE_KEY` (base64-encoded 32-byte key), and an explicitly evaluated `FACE_MATCH_THRESHOLD`. Keep the Python service private and allow network access only from the Node API. Use HTTPS for frontend, API, and internal service communication; if frontend and API are on different sites, set `COOKIE_SAME_SITE=none` (which requires secure cookies). Set the frontend's `VITE_API_BASE_URL` to the public API `/api/v1` URL and rebuild the frontend. Never publish `.env` or put backend secrets in frontend build variables.

MongoDB transactions are not required for the implemented single-document attendance upsert; unique indexes enforce one session per class/day and one attendance record per student/session. Install/configure MongoDB before expecting database-backed screens or authentication to work.
