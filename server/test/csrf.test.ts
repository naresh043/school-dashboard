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

const [{ csrfProtection }, { authCookieName, csrfCookieName, cookieOptions, csrfCookieOptions }, { env }, { createCorsOptions }, { logout }] = await Promise.all([
  import("../src/middleware/csrf.middleware.js"),
  import("../src/middleware/auth.middleware.js"),
  import("../src/config/env.js"),
  import("../src/config/cors.js"),
  import("../src/modules/auth/auth.controller.js"),
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
  assert.equal(csrfCookieOptions(60000).httpOnly, true);
  assert.equal(csrfCookieOptions(60000).maxAge, 60000);
});

test("CORS reflects only configured origins and enables credentials", async () => {
  const options = createCorsOptions(env.CLIENT_ORIGIN);
  assert.equal(options.credentials, true);
  const allowed = await new Promise((resolve, reject) => options.origin("https://school-demo.example", (error, result) => error ? reject(error) : resolve(result)));
  const denied = await new Promise((resolve, reject) => options.origin("https://unapproved.example", (error, result) => error ? reject(error) : resolve(result)));
  assert.equal(allowed, true);
  assert.equal(denied, false);
});

test("credentialed OPTIONS preflight is completed before CSRF validation", async () => {
  const [{ default: express }, { default: cors }] = await Promise.all([import("express"), import("cors")]);
  const app = express();
  app.use(cors(createCorsOptions(env.CLIENT_ORIGIN)));
  app.use(csrfProtection);
  app.post("/unsafe", (_request, response) => response.json({ success: true }));
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/unsafe`, {
      method: "OPTIONS",
      headers: {
        origin: "https://school-demo.example",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type,x-csrf-token",
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "https://school-demo.example");
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
    assert.match(response.headers.get("access-control-allow-headers") ?? "", /x-csrf-token/i);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve(undefined)));
  }
});

test("logout clears both host-only cookies with the same path and security attributes", () => {
  const cleared = [];
  const response = {
    clearCookie(name, options) { cleared.push({ name, options }); return this; },
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; },
  };
  logout({} as never, response as never, (() => {}) as never);
  assert.deepEqual(cleared.map((cookie) => cookie.name), [authCookieName, csrfCookieName]);
  for (const { options } of cleared) {
    assert.equal(options.secure, true);
    assert.equal(options.sameSite, "none");
    assert.equal(options.path, "/");
  }
  assert.equal(cleared[0].options.httpOnly, true);
  assert.equal(cleared[1].options.httpOnly, true);
  assert.deepEqual(response.body, { success: true, data: null, message: "Signed out successfully" });
});
