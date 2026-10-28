const unsafeMethods = new Set(["post", "put", "patch", "delete"]);
let csrfToken = null;
let csrfRefreshPromise = null;

export function setCsrfToken(token) {
  csrfToken = typeof token === "string" && token.length > 0 ? token : null;
}

export function clearCsrfToken() {
  csrfToken = null;
}

export function getCsrfToken() {
  return csrfToken;
}

export function applyAuthResponse(data) {
  setCsrfToken(data?.csrfToken);
  return data?.user;
}

export function refreshCsrfToken(fetchAuthResponse) {
  if (!csrfRefreshPromise) {
    csrfRefreshPromise = Promise.resolve()
      .then(fetchAuthResponse)
      .then((data) => {
        applyAuthResponse(data);
        return Boolean(getCsrfToken());
      })
      .catch(() => {
        clearCsrfToken();
        return false;
      })
      .finally(() => {
        csrfRefreshPromise = null;
      });
  }
  return csrfRefreshPromise;
}

export function isUnsafeMethod(method) {
  return unsafeMethods.has(String(method || "get").toLowerCase());
}

export function applyCsrfHeader(config) {
  const method = (config.method || "get").toLowerCase();
  const token = getCsrfToken();
  if (isUnsafeMethod(method) && token) config.headers.set("x-csrf-token", token);
  else config.headers.delete("x-csrf-token");
  return config;
}
