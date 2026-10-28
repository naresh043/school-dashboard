# Private face-recognition adapter (development only)

This FastAPI service is a protocol and image-validation stub. Its provider is explicitly `mock-unavailable`: it never emits an embedding, match, or identity. `/v1/health` therefore reports `ready: false`, and `/v1/embedding` always returns 503 after validating the request. Bind it to a private network only; it requires the same randomly generated `RECOGNITION_SERVICE_SECRET` as the Node API. Do not expose it through a public ingress.

The browser must call only the authenticated Node API. Node validates the HOD session, student/class, authorization reference, payload limits, and rate limits before calling this service over its private URL. Configure HTTPS for the internal hop in deployed environments, network policy allowing only the API service, request timeouts, and secret rotation. The sample container must be placed on a private service network.

No recognition model is selected. InsightFace's Python SDK is MIT licensed, but its public pretrained weights are restricted to non-commercial research; production or commercial use requires a separate license. This project has not obtained that license. Face detector models included by MediaPipe detect faces but do not generate identity embeddings. Before selecting a replacement, review code, weight, and dependency licenses separately, confirm school use and deployment rights, pin model and preprocessing versions, document CPU/GPU requirements, and evaluate only with authorized consenting adults. The adapter contract returns one normalized embedding (minimum 32 dimensions), model ID, and model version, and can later be implemented by a licensed provider.

The protocol stub's direct dependencies are FastAPI (MIT), Uvicorn (BSD-3-Clause), and Pillow (MIT-CMU); its framework dependencies include Starlette (BSD-3-Clause), Pydantic (MIT), and AnyIO (MIT). These are the package metadata licenses for the pinned versions in `requirements.txt` and their current framework dependency set; generate and review a full transitive SBOM/license report whenever dependencies are updated. This records software licenses only; it does not grant any recognition model or dataset rights. Pillow is used only to validate image container, dimensions, and decodeability. Python 3.14.6 with the pinned dependencies is used by this local development setup. The stub uses CPU for protocol validation; any future inference hardware requirements are unknown until a model is licensed and selected.

The API's threshold is configurable and range-validated, but its current default is not calibrated and must not be deployed as an acceptance threshold. Evaluate false acceptance (an unknown or different person accepted) and false rejection (the enrolled person rejected), lighting, distance, pose, appearance changes, image quality, unknown people, multiple faces, and similar-looking adults. A score is not a probability. No liveness or anti-spoofing is provided; printed photos and replayed video remain possible attacks. Recognition never writes attendance.

Local Node configuration uses `RECOGNITION_SERVICE_URL=http://127.0.0.1:8001`; Node and Python must receive the same generated `RECOGNITION_SERVICE_SECRET` (at least 32 characters). Keep the value in secret storage/environment variables. Python reads its own process environment and does not load `server/.env`. Do not print or commit this value. The checked-in model ID/version are `unconfigured` placeholders; Node readiness stays unavailable until an authorized model ID/version and a valid `FACE_TEMPLATE_KEY` are configured. Start from the project root in PowerShell:

```powershell
cd recognition-service
.\.venv\Scripts\Activate.ps1
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8001
```

With valid internal authentication, `GET /v1/health` returns HTTP 200 with `ready:false`; missing or invalid tokens return HTTP 401. A valid synthetic image sent to `POST /v1/embedding` returns HTTP 503 because no licensed model is configured; invalid image/request data returns HTTP 400 and missing/invalid tokens return HTTP 401. `/docs`, `/openapi.json`, and `/` are disabled/unregistered by design. Python HTTP-level tests use FastAPI's `TestClient` and synthetic images. Install the test-only client dependency once and run from this directory using the active virtual environment:

```powershell
python -m pip install -r requirements-test.txt
python -m unittest -v test_service.py
```

Backend tests run with `npm test` from `server/`; run `npm run typecheck` there for type checks.

Enrollment images are held in request memory and not retained. MongoDB stores AES-256-GCM encrypted embeddings only; keys stay in server-side secret storage. Revoke hard-deletes the current template and disables consent authorization, but deleted values can persist in database backups and journals according to backup retention. Establish and test backup expiry/purge procedures before any production enrollment. Audit entries retain actor, action, student for enrollment actions, class and outcome for recognition attempts, and expire after two years; raw images, vectors, thresholds, and scores are not logged.

The authorization-reference endpoint records an opaque reference to an independently approved consent/authorization record. It is not a checkbox, does not itself establish legal consent, and must not be used for real children until the school defines a reviewed process, retention policy, notices, and deletion rules.
