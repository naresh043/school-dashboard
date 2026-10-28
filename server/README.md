# Guru Sri Vidya Mandira API

Node.js 20.19+ is required; the repository was developed with Node 22.21.0. The API is a separate Express/TypeScript service. It requires a reachable MongoDB database and a generated JWT secret before it can start.

## Local setup (Windows / PowerShell)

1. Install MongoDB Community locally and start the MongoDB service, or provision a development database with a trusted MongoDB provider. The example URI uses local MongoDB only.
2. If `server/.env` does not exist, copy `server/.env.example` to `server/.env`. Do not overwrite existing settings or commit `.env`.
3. Replace the example `JWT_SECRET` with a generated secret; the application rejects the placeholder. Set `FACE_RECOGNITION_ENABLED=false` for the client demo. No Python recognition service, recognition secret, model ID/version, template key, or threshold is needed in this mode.
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

Python service HTTP tests (run from `recognition-service` with its virtual environment active; install the test-only client dependency once):

```powershell
python -m pip install -r requirements-test.txt
python -m unittest -v test_service.py
```

Backend tests run with `npm test` from `server/`.

Health returns HTTP 503 with `DATABASE_UNAVAILABLE` until MongoDB is connected. Other API responses use `{ success, data, message }` or `{ success: false, error }`. All application data routes require a signed-in Head of Department. Login is rate limited; the staff session uses an HTTP-only JWT cookie plus a double-submit CSRF cookie/header for state-changing requests.

Available API groups are `/api/v1/auth`, `/students`, `/classes`, `/teachers`, `/dashboard/summary`, `/attendance/sessions`, and the face-recognition routes. Attendance APIs accept manual statuses only. `method: "face"` is rejected and identity results never write attendance. Face detection stays in the browser. The Phase 3 capture buttons send a single frame through the authenticated Node API only after explicit action; the current unconfigured model adapter refuses enrollment and recognition and retains no frames.

Phase 3 adds `PUT /api/v1/students/:studentId/face-authorization`, `GET /api/v1/students/:studentId/face-enrollment`, `POST /api/v1/students/:studentId/face-enrollments`, `DELETE /api/v1/students/:studentId/face-enrollment`, `POST /api/v1/face-recognition/identify`, and authenticated `GET /api/v1/face-recognition/health`. All require the current HOD role, strict payload schemas, and image request rate limits. An authorization reference is an opaque pointer to a separately approved record; the app does not establish consent. `face-enrollments` is a separate collection. Embeddings are AES-256-GCM encrypted with a server-only 32-byte key. Revocation disables authorization and deletes the current template; backups may retain deleted data until their configured expiry.

## Recognition availability

The client-demo configuration sets `FACE_RECOGNITION_ENABLED=false` (the default). The Python recognition service is not required or called. Authenticated `GET /api/v1/face-recognition/health` reports `status: "unavailable"`, `modelConfigured: false`, and `reason: "recognition_disabled"`. Other face-recognition endpoints return a safe HTTP 503 `FACE_RECOGNITION_DISABLED` response after their existing authentication, authorization, rate-limit, and request-validation checks. They do not read or change face templates. Browser face detection may run locally, but the UI states that a detected face is not verified identity. Recognition never writes attendance; manual attendance remains a separate API path.

The recognition architecture remains available for a future approved provider. To opt in later, set `FACE_RECOGNITION_ENABLED=true` and provide `RECOGNITION_SERVICE_URL` (HTTPS in production), `RECOGNITION_SERVICE_SECRET` (at least 32 characters), licensed `RECOGNITION_MODEL_ID` and `RECOGNITION_MODEL_VERSION`, `FACE_TEMPLATE_KEY` (base64-encoded 32-byte AES key), and an explicitly evaluated `FACE_MATCH_THRESHOLD`. The provider must implement the existing private Python HTTP contract, and the model/weight/data rights, privacy review, and accuracy evaluation must be approved first. Keep the provider private and do not call it from the browser. No model is integrated or activated by this demo configuration.

## Deployment

Deploy the API as a persistent Node.js service separately from the Vite static frontend. For the demo, set these backend environment variables in Render:

- `NODE_ENV=production`
- `MONGODB_URI` to the deployed MongoDB connection URI
- `JWT_SECRET` to a generated secret (at least 32 characters; not the example placeholder)
- `CLIENT_ORIGIN` to the exact HTTPS frontend origin
- `COOKIE_SECURE=true`
- `FACE_RECOGNITION_ENABLED=false`

Render supplies `PORT`; the API listens on `0.0.0.0`. `COOKIE_SAME_SITE` is optional (default browser same-site policy); if frontend and API are on different sites, set it to `none`, which requires secure cookies. Set the frontend build variable `VITE_API_BASE_URL` to `https://<backend-host>/api/v1`, then rebuild the frontend. This is public URL configuration, not a secret. Do not set backend credentials as `VITE_` variables or publish `.env` files. No Python service or recognition-only variables are required for the demo. If recognition is deliberately enabled in a future approved deployment, supply all provider variables described above and keep the service private.

MongoDB transactions are not required for the implemented single-document attendance upsert; unique indexes enforce one session per class/day and one attendance record per student/session. Install/configure MongoDB before expecting database-backed screens or authentication to work.
