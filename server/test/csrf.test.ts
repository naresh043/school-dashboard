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

const [{ csrfProtection }, { authCookieName, csrfCookieName, cookieOptions, csrfCookieOptions }, { env }, { createCorsOptions }, { currentUser, login, logout }, { User }, { default: bcrypt }] = await Promise.all([
  import("../src/middleware/csrf.middleware.js"),
  import("../src/middleware/auth.middleware.js"),
  import("../src/config/env.js"),
  import("../src/config/cors.js"),
  import("../src/modules/auth/auth.controller.js"),
  import("../src/modules/auth/user.model.js"),
  import("bcryptjs"),
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

test("OPTIONS passes CSRF middleware and permitted origin policy allows credentialed requests", async () => {
  assert.equal(invokeCsrf({ method: "OPTIONS", cookieToken: undefined, headerToken: undefined }).passed, true);
  const options = createCorsOptions(env.CLIENT_ORIGIN);
  assert.equal(options.credentials, true);
  const allowed = await new Promise((resolve, reject) => options.origin("https://school-demo.example", (error, result) => error ? reject(error) : resolve(result)));
  assert.equal(allowed, true);
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

test("login and current-user restoration return the cookie-matched CSRF token", async () => {
  const originalFindOne = User.findOne;
  const passwordHash = await bcrypt.hash("synthetic-password", 4);
  const user = {
    _id: "507f1f77bcf86cd799439011",
    id: "507f1f77bcf86cd799439011",
    name: "Synthetic Staff",
    email: "synthetic@example.test",
    department: "Testing",
    role: "head-of-department",
    isActive: true,
    passwordHash,
  };
  User.findOne = (() => {
    const query = {
      select() { return query; },
      lean: async () => user,
      then(resolve, reject) { return Promise.resolve(user).then(resolve, reject); },
    };
    return query;
  }) as typeof User.findOne;
  const makeResponse = () => ({
    cookies: [],
    body: undefined,
    statusCode: 0,
    cookie(name, value, options) { this.cookies.push({ name, value, options }); return this; },
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; },
  });
  try {
    const loginResponse = makeResponse();
    let loginError;
    await login({ body: { email: user.email, password: "synthetic-password" } } as never, loginResponse as never, (error) => { loginError = error; });
    assert.equal(loginError, undefined);
    const loginData = loginResponse.body.data;
    const csrfCookie = loginResponse.cookies.find((cookie) => cookie.name === csrfCookieName);
    const authCookie = loginResponse.cookies.find((cookie) => cookie.name === authCookieName);
    assert.equal(csrfCookie.value, loginData.csrfToken);
    assert.equal(csrfCookie.options.httpOnly, true);
    assert.equal(authCookie.options.httpOnly, true);
    assert.equal(csrfCookie.options.sameSite, "none");
    assert.equal(csrfCookie.options.secure, true);

    const restoredResponse = makeResponse();
    await currentUser({ auth: { id: user.id }, cookies: { [csrfCookieName]: csrfCookie.value } } as never, restoredResponse as never, (error) => { throw error; });
    assert.equal(restoredResponse.body.data.csrfToken, csrfCookie.value);
    assert.equal(restoredResponse.cookies.length, 0);

    const initializedResponse = makeResponse();
    await currentUser({ auth: { id: user.id }, cookies: {} } as never, initializedResponse as never, (error) => { throw error; });
    assert.equal(initializedResponse.body.data.csrfToken, initializedResponse.cookies[0].value);
    assert.equal(initializedResponse.cookies[0].options.httpOnly, true);
  } finally {
    User.findOne = originalFindOne;
  }
});
