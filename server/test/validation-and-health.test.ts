import assert from "node:assert/strict";
import { test } from "node:test";

Object.assign(process.env, {
  NODE_ENV: "test",
  PORT: "5000",
  MONGODB_URI: "mongodb://127.0.0.1:27017/guru_sri_vidya_test",
  CLIENT_ORIGIN: "http://localhost:5173",
  JWT_SECRET: "test-only-secret-that-is-never-used-for-a-session",
  COOKIE_SECURE: "false",
  FACE_RECOGNITION_ENABLED: "false",
  RECOGNITION_SERVICE_URL: "http://127.0.0.1:8001",
  RECOGNITION_SERVICE_SECRET: "test-only-private-recognition-service-secret",
  RECOGNITION_MODEL_ID: "test-model",
  RECOGNITION_MODEL_VERSION: "test-version",
  FACE_TEMPLATE_KEY: Buffer.alloc(32, 17).toString("base64"),
  FACE_MATCH_THRESHOLD: "0.81",
});

const [{ parseEnvironment }, { updateAttendanceSchema }, { studentListQuerySchema }, { getHealthPayload }] = await Promise.all([
  import("../src/config/env.js"),
  import("../src/modules/attendance/attendance.schema.js"),
  import("../src/modules/students/student.schema.js"),
  import("../src/app.js"),
]);

test("environment parsing rejects missing or unsafe required configuration", () => {
  assert.throws(() => parseEnvironment({ MONGODB_URI: "mongodb://127.0.0.1/db", JWT_SECRET: "short" }));
  assert.throws(() => parseEnvironment({ NODE_ENV: "production", MONGODB_URI: "mongodb://127.0.0.1/db", JWT_SECRET: "x".repeat(48), CLIENT_ORIGIN: "http://school.example", COOKIE_SECURE: "false" }));
  assert.throws(() => parseEnvironment({ NODE_ENV: "production", MONGODB_URI: "mongodb://127.0.0.1/db", JWT_SECRET: "x".repeat(48), CLIENT_ORIGIN: "https://school.example", COOKIE_SECURE: "true", FACE_RECOGNITION_ENABLED: "true", RECOGNITION_SERVICE_URL: "http://recognition.internal", RECOGNITION_SERVICE_SECRET: "s".repeat(40), RECOGNITION_MODEL_ID: "licensed-model", RECOGNITION_MODEL_VERSION: "1", FACE_TEMPLATE_KEY: Buffer.alloc(32, 18).toString("base64"), FACE_MATCH_THRESHOLD: "0.81" }));
  assert.doesNotThrow(() => parseEnvironment({ NODE_ENV: "development", MONGODB_URI: "mongodb://127.0.0.1/db", JWT_SECRET: "x".repeat(48), RECOGNITION_SERVICE_URL: "http://127.0.0.1:8001", RECOGNITION_SERVICE_SECRET: "replace_with_a_random_internal_secret_at_least_32_chars", RECOGNITION_MODEL_ID: "unconfigured", RECOGNITION_MODEL_VERSION: "unconfigured" }));
});

test("production client-demo configuration needs no recognition provider and keeps core security checks strict", () => {
  const demoConfig = {
    NODE_ENV: "production",
    MONGODB_URI: "mongodb://127.0.0.1/school_demo",
    JWT_SECRET: "production-only-generated-secret-0123456789",
    CLIENT_ORIGIN: "https://school-demo.example",
    COOKIE_SECURE: "true",
    FACE_RECOGNITION_ENABLED: "false",
  };
  const parsed = parseEnvironment(demoConfig);
  assert.equal(parsed.FACE_RECOGNITION_ENABLED, false);
  assert.equal(parsed.RECOGNITION_SERVICE_URL, undefined);
  assert.equal(parsed.RECOGNITION_SERVICE_SECRET, undefined);
  assert.equal(parsed.RECOGNITION_MODEL_ID, undefined);
  assert.equal(parsed.RECOGNITION_MODEL_VERSION, undefined);
  assert.equal(parsed.FACE_TEMPLATE_KEY, undefined);
  assert.doesNotThrow(() => parseEnvironment({
    ...demoConfig,
    RECOGNITION_SERVICE_URL: "not-a-url",
    RECOGNITION_SERVICE_SECRET: "short",
    RECOGNITION_MODEL_ID: "",
    RECOGNITION_MODEL_VERSION: "",
    FACE_TEMPLATE_KEY: "not-a-key",
    FACE_MATCH_THRESHOLD: "not-a-number",
  }));
  assert.throws(() => parseEnvironment({ ...demoConfig, MONGODB_URI: undefined }));
  assert.throws(() => parseEnvironment({ ...demoConfig, JWT_SECRET: "short" }));
  assert.throws(() => parseEnvironment({ ...demoConfig, COOKIE_SECURE: "false" }));
  assert.throws(() => parseEnvironment({ ...demoConfig, CLIENT_ORIGIN: "http://school-demo.example" }));
});

test("manual attendance validation rejects face method and invalid pagination", () => {
  assert.equal(updateAttendanceSchema.safeParse({ status: "present", method: "manual" }).success, true);
  assert.equal(updateAttendanceSchema.safeParse({ status: "present", method: "face" }).success, false);
  assert.equal(studentListQuerySchema.safeParse({ page: "0" }).success, false);
  assert.equal(studentListQuerySchema.safeParse({ page: "1", limit: "5000" }).success, false);
});

test("health status reports MongoDB as unavailable instead of healthy when disconnected", () => {
  assert.deepEqual(getHealthPayload(), { status: 503, body: { success: false, error: { code: "DATABASE_UNAVAILABLE", message: "Database connection is unavailable" } } });
});
