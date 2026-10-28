import assert from "node:assert/strict";
import { test } from "node:test";

Object.assign(process.env, {
  NODE_ENV: "test",
  PORT: "5000",
  MONGODB_URI: "mongodb://127.0.0.1:27017/guru_sri_vidya_test",
  CLIENT_ORIGIN: "http://localhost:5173",
  JWT_SECRET: "test-only-secret-that-is-never-used-for-a-session",
  COOKIE_SECURE: "false",
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
