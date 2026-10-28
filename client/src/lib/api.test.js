import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosHeaders } from "axios";
import { applyAuthResponse, applyCsrfHeader, clearCsrfToken, getCsrfToken, isUnsafeMethod, setCsrfToken } from "./csrfToken.js";

test("CSRF token is initialized and cleared only in module memory", () => {
  clearCsrfToken();
  assert.equal(getCsrfToken(), null);
  setCsrfToken("synthetic-csrf-token");
  assert.equal(getCsrfToken(), "synthetic-csrf-token");
  setCsrfToken(undefined);
  assert.equal(getCsrfToken(), null);
});

test("successful auth responses from login or current-user refresh initialize the token", () => {
  clearCsrfToken();
  const user = { id: "synthetic-user" };
  assert.equal(applyAuthResponse({ user, csrfToken: "login-token" }), user);
  assert.equal(getCsrfToken(), "login-token");
  applyAuthResponse({ user, csrfToken: "refreshed-token" });
  assert.equal(getCsrfToken(), "refreshed-token");
  applyAuthResponse({ user });
  assert.equal(getCsrfToken(), null);
});

test("only unsafe methods receive the CSRF request header", () => {
  for (const method of ["post", "put", "patch", "delete"]) assert.equal(isUnsafeMethod(method), true);
  for (const method of ["get", "head", "options"]) assert.equal(isUnsafeMethod(method), false);
});

test("an absent CSRF token remains absent for unsafe requests", () => {
  clearCsrfToken();
  const config = applyCsrfHeader({ method: "post", headers: new AxiosHeaders({ "x-csrf-token": "stale" }) });
  assert.equal(config.headers.has("x-csrf-token"), false);
});

test("the current token is attached only to unsafe requests", () => {
  setCsrfToken("synthetic-csrf-token");
  const unsafe = applyCsrfHeader({ method: "patch", headers: new AxiosHeaders() });
  const safe = applyCsrfHeader({ method: "get", headers: new AxiosHeaders({ "x-csrf-token": "stale" }) });
  assert.equal(unsafe.headers.get("x-csrf-token"), "synthetic-csrf-token");
  assert.equal(safe.headers.has("x-csrf-token"), false);
  clearCsrfToken();
});
