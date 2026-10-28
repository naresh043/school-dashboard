# Face model license and integration audit

**Status:** research only, as of 2026-10-28. No candidate is approved for deployment. No model weights or recognition packages were downloaded or installed. The development provider remains unavailable.

## Current provider and safety boundary

`recognition-service/app.py` exposes authenticated `GET /v1/health` and `POST /v1/embedding`. Health always returns `ready: false`, provider `mock-unavailable`, and reason `licensed_model_not_configured`; embedding validates the request and then returns HTTP 503. The service has no model-loading path or embedding implementation.

Node's `recognition-client.ts` requires URL, internal secret, model ID/version, and `FACE_TEMPLATE_KEY` before reporting model configuration. It only treats provider health as ready when the response body has `ready: true`. `face-recognition.service.ts` checks readiness before enrollment and recognition: enrollment fails before template upsert, while recognition returns `service_unavailable` before candidate lookup. `face-recognition.routes.ts` retains authentication, HOD authorization, schema validation, and image rate limits. The recognition module contains no attendance writes. The browser's MediaPipe detector is separate and only detects faces; it does not identify students.

## Candidate A: OpenCV Zoo SFace (not approved)

| Audit item | Finding |
|---|---|
| Model | SFace MobileFaceNet face-recognition embedding model. It is a candidate only, not a recommendation or approval. |
| Exact weight | `face_recognition_sface_2021dec.onnx` (OpenCV Zoo reports about 36.9 MB, stored with Git LFS). |
| Source | [OpenCV Zoo weight file](https://github.com/opencv/opencv_zoo/blob/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx); [SFace model README](https://github.com/opencv/opencv_zoo/blob/main/models/face_recognition_sface/README.md). This mutable `main` URL is not an immutable artifact pin; a commit and verified checksum must be recorded before any future use. |
| Model implementation/code license | OpenCV Zoo says all files in the SFace model directory are Apache-2.0. OpenCV 4.5.0+ itself is Apache-2.0. These are repository/license statements, not independent confirmation of all upstream rights. |
| Weight license | Repository-stated Apache-2.0 for the directory. Whether that fully clears this exact pretrained checkpoint and its upstream rights for this school's deployment remains **UNKNOWN**; see [open upstream clarification issue #313](https://github.com/opencv/opencv_zoo/issues/313). Do not treat the code license as proof of weight or dataset rights. |
| Training-data provenance | **UNKNOWN for this exact December 2021 ONNX checkpoint.** The SFace paper discusses models trained on CASIA-WebFace, VGGFace2, and MS-Celeb-1M in its experiments, but does not establish which data produced this exported file. Dataset license and downstream weight restrictions are also **UNKNOWN**. |
| Commercial use | Apache-2.0 is a permissive software license, but commercial permission for this exact weight, considering upstream and training-data rights, is **UNKNOWN pending an authorized clarification/legal review**. No inference should be enabled based only on the code license. |
| Redistribution / attribution | If Apache-2.0 is applicable, comply with its license conditions: provide the license, preserve applicable copyright/patent/trademark/attribution notices, mark modified files, and carry any applicable NOTICE content. Whether the exact ONNX file is fully covered is unresolved. Do not redistribute before that is resolved. |
| Dependencies | Candidate path: OpenCV Python bindings exposing `FaceRecognizerSF` (OpenCV Zoo demo also uses NumPy). OpenCV 4.5.0+ is Apache-2.0. A server-side detector/landmark source is additionally needed for SFace's five-landmark alignment; the current browser detector does not send landmarks. Exact compatible package/version and transitive licenses are **UNKNOWN** and none are installed for recognition. |

## Supporting detector candidate: OpenCV Zoo YuNet (not approved)

The SFace Zoo demo uses a detector that supplies five facial landmarks. A possible local detector artifact is `face_detection_yunet_2023mar.onnx` from [OpenCV Zoo](https://github.com/opencv/opencv_zoo/blob/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx), with its [model README](https://github.com/opencv/opencv_zoo/blob/main/models/face_detection_yunet/README.md). The README reports all files in that directory under MIT and describes YuNet as trained for WIDER Face; exact checkpoint training-data records, dataset rights, and commercial-use clearance are **UNKNOWN**. MIT redistribution requires preserving the copyright and permission notice. This detection model does not identify people and cannot substitute for SFace. Validate compatibility and required input sizes before any integration.

## Exact integration points for a future provider

1. **Python adapter — `app.py`:** add explicit model artifact configuration/loading and a separate provider implementation behind the existing routes. Health may become ready only after the licensed artifacts load and expected model ID/version/checksum are verified. Keep image validation, internal token checks, loopback/private binding, and safe error responses. Embedding must return the existing contract (embedding, model ID, model version) only on real inference; unavailable/error paths must remain non-success. SFace needs a detector/landmarks and its aligned crop/preprocessing, not just the current raw image validator.
2. **Python dependencies/config — `requirements.txt` and deployment configuration:** add only selected, pinned inference dependencies and model artifact paths after license, Python-version, hardware, and vulnerability review. Weights should be separately provisioned, checksum-pinned, and excluded from source control unless redistribution is affirmatively cleared. No weights or packages were added in this audit.
3. **Node adapter — `server/src/modules/face-recognition/recognition-client.ts`:** retain readiness gating, safe status mapping, output dimension/norm/model-version validation, and timeout. Verify the real SFace output shape and preprocessing contract against the Node encrypted-template format; the current validator accepts vectors of at least 32 values, which is not a substitute for provider-specific compatibility checks.
4. **Node workflows — `face-recognition.service.ts`:** retain approved authorization checks, model/version matching, encrypted template writes and audit behavior. Preserve unavailable checks before embedding/enrollment upsert and candidate lookup. Do not add attendance writes; recognition outcomes remain informational.
5. **HTTP/API and UI — `face-recognition.routes.ts`, controllers, and React attendance page:** keep authenticated Node-only access, HOD authorization, schema/rate checks, consent reference flow, and disabled actions until Node health is ready. Do not expose the Python provider to the browser. Do not treat local face detection as identity verification.
6. **Operations/evaluation:** add synthetic unit/integration tests for loading failure, invalid images, embedding contract, model/version mismatch, threshold calibration, unknown people, false accept/reject rates, demographics, spoofing/liveness limitations, retention, and revocation before any identity action is enabled. These checks do not resolve licensing.

## Cost separation (no claim that total cost is zero)

| Cost area | Current evidence / estimate |
|---|---|
| Model license | **UNKNOWN.** The repository advertises Apache-2.0 for SFace files, but exact checkpoint and data rights remain unresolved. No license quote or written upstream confirmation was found; possible fee is unknown. |
| Local inference | No hosted API fee is implied by local inference. Additional hardware/compute, electricity, storage, and dependency installation costs depend on the deployment machine and are **UNKNOWN**. |
| Hosting | A local/private service could reuse existing infrastructure, but capacity, availability, backup, and any production hosting cost are **UNKNOWN**. No paid service is introduced. |
| Maintenance | Version pinning, security updates, model provenance review, legal/privacy review, evaluation, monitoring, incident response, and deletion/backup controls require effort; monetary and staff cost are **UNKNOWN**. |

## Open legal and operational questions

- Obtain an authorized written statement on whether Apache-2.0 covers the exact SFace ONNX artifact and permits the intended educational/commercial deployment and any redistribution. Upstream issue [#313](https://github.com/opencv/opencv_zoo/issues/313) asks materially similar questions and was open when checked.
- Identify the actual training dataset(s), rights, terms, and any downstream use restrictions for the exact SFace checkpoint and YuNet detector. Do not infer them from the paper's benchmark dataset list.
- Confirm school use, children's biometric-data requirements, consent/authorization process, retention, and jurisdiction-specific privacy obligations with qualified counsel. **UNKNOWN** here; this audit is not legal advice.
- Decide whether weights may be stored in the repository, private artifact storage, or deployment images; record immutable revisions and checksums only after permission is established.
- Evaluate inference speed/accuracy and spoofing, and calibrate an acceptance threshold on authorized data before considering use. Current configured threshold is not calibrated evidence.

Until these questions are resolved and a separately approved implementation is made, keep `mock-unavailable`: health remains not ready, embedding returns 503, and the system cannot identify a student or automatically mark attendance.
