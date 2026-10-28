import assert from "node:assert/strict";
import { test } from "node:test";

Object.assign(process.env, {
  NODE_ENV: "test",
  PORT: "5000",
  MONGODB_URI: "mongodb://127.0.0.1:27017/guru_sri_vidya_test",
  CLIENT_ORIGIN: "http://localhost:5173",
  JWT_SECRET: "test-only-secret-that-is-never-used-for-a-session",
  COOKIE_SECURE: "false",
  RECOGNITION_SERVICE_URL: "http://recognition.test",
  RECOGNITION_SERVICE_SECRET: "test-only-private-recognition-service-secret",
  RECOGNITION_MODEL_ID: "test-model",
  RECOGNITION_MODEL_VERSION: "test-version",
  FACE_TEMPLATE_KEY: Buffer.alloc(32, 17).toString("base64"),
  FACE_MATCH_THRESHOLD: "0.81",
});

const [{ classifyCandidates, cosineSimilarity, decryptTemplate, encryptTemplate, isValidEmbedding }, { enrollmentSchema, recognitionSchema }, { createEmbedding, isRecognitionConfigured, recognitionHealth }, { requireHeadOfDepartment }, { env }] = await Promise.all([
  import("../src/modules/face-recognition/template-crypto.js"),
  import("../src/modules/face-recognition/face-recognition.schema.js"),
  import("../src/modules/face-recognition/recognition-client.js"),
  import("../src/middleware/auth.middleware.js"),
  import("../src/config/env.js"),
]);

const [{ enrollStudent, identifyStudent }, { Student }, { SchoolClass }, { FaceEnrollment }, { FaceAuditEvent }, { AttendanceRecordModel }, { AttendanceSession }, { setManualAttendance }] = await Promise.all([
  import("../src/modules/face-recognition/face-recognition.service.js"),
  import("../src/modules/students/student.model.js"),
  import("../src/modules/classes/class.model.js"),
  import("../src/modules/face-recognition/face-enrollment.model.js"),
  import("../src/modules/face-recognition/face-audit.model.js"),
  import("../src/modules/attendance/attendance-record.model.js"),
  import("../src/modules/attendance/attendance-session.model.js"),
  import("../src/modules/attendance/attendance.service.js"),
]);
const { errorHandler } = await import("../src/middleware/error.middleware.js");

test("face templates are AES-GCM encrypted and tampering is rejected", () => {
  const vector = Array.from({ length: 128 }, (_, index) => index === 3 ? 1 : 0);
  const encrypted = encryptTemplate(vector);
  assert.equal("embedding" in encrypted, false);
  assert.deepEqual(decryptTemplate(encrypted), vector);
  assert.throws(() => decryptTemplate({ ...encrypted, encryptedTemplate: Buffer.alloc(160, 1).toString("base64") }));
});

test("embedding validation and candidate decisions reject invalid and ambiguous vectors", () => {
  const vectorA = Array.from({ length: 128 }, (_, index) => index === 3 ? 1 : 0);
  const vectorB = Array.from({ length: 128 }, (_, index) => index === 4 ? 1 : 0);
  assert.equal(isValidEmbedding(vectorA), true);
  assert.equal(isValidEmbedding([0, Number.NaN]), false);
  assert.equal(cosineSimilarity(vectorA, vectorB), 0);
  assert.deepEqual(classifyCandidates([], 0.81), { outcome: "no_match" });
  assert.deepEqual(classifyCandidates([{ studentId: "synthetic-a", score: 0.8 }], 0.81), { outcome: "no_match" });
  assert.deepEqual(classifyCandidates([{ studentId: "synthetic-a", score: 0.9 }, { studentId: "synthetic-b", score: 0.88 }], 0.81), { outcome: "uncertain" });
  assert.deepEqual(classifyCandidates([{ studentId: "synthetic-a", score: 0.9 }, { studentId: "synthetic-b", score: 0.7 }], 0.81), { outcome: "match", studentId: "synthetic-a" });
});

test("image schemas reject invalid MIME types, payloads, and identifiers", () => {
  assert.equal(enrollmentSchema.safeParse({ image: { mimeType: "image/gif", data: "YQ==" } }).success, false);
  assert.equal(enrollmentSchema.safeParse({ image: { mimeType: "image/jpeg", data: "YQ==" } }).success, false);
  assert.equal(recognitionSchema.safeParse({ classId: "invalid", image: { mimeType: "image/jpeg", data: "YQ==" } }).success, false);
});

test("face operations reject users without the authorized HOD role", async () => {
  const authorize = (role?: string) => new Promise<unknown>((resolve) => {
    requireHeadOfDepartment({ auth: role ? { id: "synthetic-user", role } : undefined } as never, {} as never, (error) => resolve(error));
  });
  assert.equal((await authorize("teacher") as { statusCode: number }).statusCode, 403);
  assert.equal(await authorize("head-of-department"), undefined);
});

test("recognition-service timeout is returned as unavailable without image logging", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new DOMException("timeout", "AbortError"); }) as typeof fetch;
  try {
    await assert.rejects(() => createEmbedding({ mimeType: "image/jpeg", data: "AA==" }), { code: "RECOGNITION_SERVICE_UNAVAILABLE", statusCode: 503 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("readiness requires URL, internal auth, model ID/version, and template encryption", () => {
  assert.equal(isRecognitionConfigured(env), true);
  assert.equal(isRecognitionConfigured({ ...env, RECOGNITION_MODEL_VERSION: undefined }), false);
  assert.equal(isRecognitionConfigured({ ...env, FACE_TEMPLATE_KEY: undefined }), false);
  assert.equal(isRecognitionConfigured({ ...env, RECOGNITION_SERVICE_SECRET: undefined }), false);
});

test("health distinguishes missing config, an unready mock, auth failure, and outage", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => { throw new Error("must not be called without complete config"); }) as typeof fetch;
    assert.deepEqual(await recognitionHealth({ ...env, RECOGNITION_MODEL_VERSION: undefined }), { ready: false, modelConfigured: false, reason: "configuration_missing" });

    globalThis.fetch = (async () => new Response(JSON.stringify({ ready: false, provider: "mock-unavailable" }), { status: 200 })) as typeof fetch;
    assert.deepEqual(await recognitionHealth(), { ready: false, modelConfigured: true, reason: "model_not_ready" });

    globalThis.fetch = (async () => new Response(null, { status: 401 })) as typeof fetch;
    assert.deepEqual(await recognitionHealth(), { ready: false, modelConfigured: true, reason: "service_auth_failed" });

    globalThis.fetch = (async () => new Response(null, { status: 503 })) as typeof fetch;
    assert.deepEqual(await recognitionHealth(), { ready: false, modelConfigured: true, reason: "service_unavailable" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unavailable provider cannot enroll a template or return a student identity", async () => {
  const originals = {
    studentFindOne: Student.findOne,
    classFindOne: SchoolClass.findOne,
    enrollmentFindOneAndUpdate: FaceEnrollment.findOneAndUpdate,
    auditCreate: FaceAuditEvent.create,
    attendanceCreate: AttendanceRecordModel.create,
    attendanceFindOneAndUpdate: AttendanceRecordModel.findOneAndUpdate,
    fetch: globalThis.fetch,
  };
  let enrollmentWrites = 0;
  let attendanceWrites = 0;
  const audits: unknown[] = [];
  const query = (value: unknown) => ({ select() { return this; }, lean: async () => value });
  Student.findOne = (() => query({ _id: "507f1f77bcf86cd799439011", isActive: true, faceAuthorization: { status: "authorized", reference: "approved-reference" } })) as typeof Student.findOne;
  SchoolClass.findOne = (() => query({ _id: "507f1f77bcf86cd799439012" })) as typeof SchoolClass.findOne;
  FaceEnrollment.findOneAndUpdate = (async () => { enrollmentWrites += 1; }) as typeof FaceEnrollment.findOneAndUpdate;
  FaceAuditEvent.create = (async (entry: unknown) => { audits.push(entry); }) as typeof FaceAuditEvent.create;
  AttendanceRecordModel.create = (async () => { attendanceWrites += 1; }) as typeof AttendanceRecordModel.create;
  AttendanceRecordModel.findOneAndUpdate = (async () => { attendanceWrites += 1; }) as typeof AttendanceRecordModel.findOneAndUpdate;
  globalThis.fetch = (async () => new Response(JSON.stringify({ ready: false, provider: "mock-unavailable", reason: "licensed_model_not_configured" }), { status: 200 })) as typeof fetch;
  try {
    await assert.rejects(() => enrollStudent("507f1f77bcf86cd799439011", { mimeType: "image/jpeg", data: "synthetic" }, "507f1f77bcf86cd799439013"), { code: "RECOGNITION_SERVICE_UNAVAILABLE", statusCode: 503 });
    const result = await identifyStudent("507f1f77bcf86cd799439012", { mimeType: "image/jpeg", data: "synthetic" }, "507f1f77bcf86cd799439013");
    assert.deepEqual(result, { outcome: "service_unavailable" });
    assert.equal(enrollmentWrites, 0);
    assert.equal(attendanceWrites, 0);
    assert.equal(audits.length, 1);
    assert.equal("student" in result, false);
  } finally {
    Student.findOne = originals.studentFindOne;
    SchoolClass.findOne = originals.classFindOne;
    FaceEnrollment.findOneAndUpdate = originals.enrollmentFindOneAndUpdate;
    FaceAuditEvent.create = originals.auditCreate;
    AttendanceRecordModel.create = originals.attendanceCreate;
    AttendanceRecordModel.findOneAndUpdate = originals.attendanceFindOneAndUpdate;
    globalThis.fetch = originals.fetch;
  }
});

test("manual attendance records status through the separate manual service path", async () => {
  const originals = {
    sessionFindById: AttendanceSession.findById,
    studentFindOne: Student.findOne,
    attendanceFindOneAndUpdate: AttendanceRecordModel.findOneAndUpdate,
  };
  const sessionId = "507f1f77bcf86cd799439014";
  const classId = "507f1f77bcf86cd799439015";
  const studentId = "507f1f77bcf86cd799439016";
  const userId = "507f1f77bcf86cd799439017";
  let savedUpdate: Record<string, unknown> | undefined;
  const query = (value: unknown) => ({ select() { return this; }, lean: async () => value });
  AttendanceSession.findById = (() => ({ lean: async () => ({ _id: sessionId, classId, status: "open" }) })) as typeof AttendanceSession.findById;
  Student.findOne = (() => query({ _id: studentId, classId })) as typeof Student.findOne;
  AttendanceRecordModel.findOneAndUpdate = ((filter: unknown, update: Record<string, unknown>) => {
    savedUpdate = update;
    const record = { _id: "507f1f77bcf86cd799439018", studentId, classId, sessionId, status: "present", method: "manual", markedBy: userId };
    return { lean: async () => record };
  }) as typeof AttendanceRecordModel.findOneAndUpdate;
  try {
    const result = await setManualAttendance(sessionId, studentId, { status: "present" }, userId);
    assert.equal(result.method, "manual");
    assert.equal(result.status, "present");
    assert.equal((savedUpdate?.$set as { method?: string }).method, "manual");
  } finally {
    AttendanceSession.findById = originals.sessionFindById;
    Student.findOne = originals.studentFindOne;
    AttendanceRecordModel.findOneAndUpdate = originals.attendanceFindOneAndUpdate;
  }
});

test("embedding maps invalid requests, internal auth failures, and provider outages distinctly", async () => {
  const originalFetch = globalThis.fetch;
  const cases = [
    { status: 400, code: "INVALID_RECOGNITION_REQUEST", apiStatus: 400 },
    { status: 401, code: "RECOGNITION_SERVICE_AUTH_FAILED", apiStatus: 502 },
    { status: 503, code: "RECOGNITION_SERVICE_UNAVAILABLE", apiStatus: 503 },
  ];
  try {
    for (const item of cases) {
      globalThis.fetch = (async () => new Response(null, { status: item.status })) as typeof fetch;
      await assert.rejects(() => createEmbedding({ mimeType: "image/jpeg", data: "AA==" }), { code: item.code, statusCode: item.apiStatus });
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unexpected API errors omit internal details and sensitive payloads", () => {
  const response = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  const originalConsoleError = console.error;
  const logLines: unknown[][] = [];
  console.error = (...values: unknown[]) => { logLines.push(values); };
  try {
    errorHandler(new Error("service-secret raw-face-image embedding stack-trace"), {} as never, response as never, (() => undefined) as never);
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(response.statusCode, 500);
  const output = JSON.stringify({ body: response.body, logLines });
  assert.doesNotMatch(output, /service-secret|raw-face-image|embedding|stack-trace/i);
  assert.match(output, /INTERNAL_ERROR/);
});
