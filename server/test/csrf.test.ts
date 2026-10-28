import assert from "node:assert/strict";
import { test } from "node:test";

Object.assign(process.env, {
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://127.0.0.1:27017/guru_sri_vidya_test",
  CLIENT_ORIGIN: "https://school-demo.example,http://localhost:5173",
  JWT_SECRET: "test-only-secret-that-is-never-used-for-a-session",
  COOKIE_SECURE: "true",
  COOKIE_SAME_SITE: "none",
  FACE_RECOGNITION_ENABLED: "false",
});

const [{ csrfProtection }, { csrfCookieName, cookieOptions }, { env }] = await Promise.all([
  import("../src/middleware/csrf.middleware.js"),
  import("../src/middleware/auth.middleware.js"),
  import("../src/config/env.js"),
]);

function invokeCsrf({ method = "POST", path = "/api/v1/attendance/sessions", origin = "https://school-demo.example", cookieToken, headerToken } = {}) {
  let passedError;
  let passed = false;
  const request = {
    method,
    path,
    cookies: cookieToken ? { [csrfCookieName]: cookieToken } : {},
    get(name) {
      if (name.toLowerCase() === "origin") return origin;
      if (name.toLowerCase() === "x-csrf-token") return headerToken;
      return undefined;
    },
  };
  csrfProtection(request, {}, (error) => {
    passedError = error;
    passed = !error;
  });
  return { error: passedError, passed };
}

test("CSRF middleware rejects missing cookie, missing header, and mismatched values", () => {
  const originalWarn = console.warn;
  const logs = [];
  console.warn = (line) => logs.push(String(line));
  try {
    assert.equal(invokeCsrf({ headerToken: "synthetic-token" }).error?.code, "CSRF_VALIDATION_FAILED");
    assert.equal(invokeCsrf({ cookieToken: "synthetic-token" }).error?.code, "CSRF_VALIDATION_FAILED");
    assert.equal(invokeCsrf({ cookieToken: "synthetic-cookie", headerToken: "synthetic-header" }).error?.code, "CSRF_VALIDATION_FAILED");
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(logs.map((line) => JSON.parse(line).reason), ["csrf_cookie_missing", "csrf_header_missing", "csrf_token_mismatch"]);
  assert.equal(logs.join(" ").includes("synthetic-token"), false);
  assert.equal(logs.join(" ").includes("synthetic-cookie"), false);
});

test("matching CSRF cookie and header are accepted; login exemption and OPTIONS remain safe", () => {
  assert.equal(invokeCsrf({ cookieToken: "same-synthetic-token", headerToken: "same-synthetic-token" }).passed, true);
  assert.equal(invokeCsrf({ path: "/api/v1/auth/login" }).passed, true);
  assert.equal(invokeCsrf({ method: "OPTIONS", cookieToken: undefined, headerToken: undefined }).passed, true);
});

test("unapproved origins are rejected and secure cross-site cookies use matching options", () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(invokeCsrf({ origin: "https://unapproved.example", cookieToken: "x", headerToken: "x" }).error?.code, "ORIGIN_NOT_ALLOWED");
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(env.CLIENT_ORIGIN, ["https://school-demo.example", "http://localhost:5173"]);
  assert.equal(cookieOptions().secure, true);
  assert.equal(cookieOptions().sameSite, "none");
  assert.equal(cookieOptions().path, "/");
});
