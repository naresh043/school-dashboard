import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { csrfCookieName } from "./auth.middleware.js";
import { ApiError } from "../utils/ApiError.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfProtection: RequestHandler = (request, _response, next) => {
  if (safeMethods.has(request.method)) {
    next();
    return;
  }

  const origin = request.get("origin");
  if (origin && !env.CLIENT_ORIGIN.includes(origin)) {
    next(new ApiError(403, "ORIGIN_NOT_ALLOWED", "This request origin is not allowed"));
    return;
  }
  if (request.method === "POST" && request.path === "/api/v1/auth/login") {
    next();
    return;
  }

  const cookieToken = request.cookies?.[csrfCookieName] as string | undefined;
  const headerToken = request.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length || !timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    next(new ApiError(403, "CSRF_VALIDATION_FAILED", "The request could not be verified. Refresh the page and try again."));
    return;
  }
  next();
};
