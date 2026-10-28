import { randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
import { authCookieName, cookieOptions, csrfCookieName } from "../../middleware/auth.middleware.js";
import { sendSuccess } from "../../utils/response.js";
import { authenticate, getPublicUser } from "./auth.service.js";

export const login: RequestHandler = async (request, response, next) => {
  try {
    const { email, password } = request.body as { email: string; password: string };
    const session = await authenticate(email, password);
    const csrfToken = randomBytes(32).toString("hex");
    const options = cookieOptions();
    response.cookie(authCookieName, session.token, { ...options, httpOnly: true, maxAge: session.maxAge });
    response.cookie(csrfCookieName, csrfToken, { ...options, httpOnly: false, maxAge: session.maxAge });
    sendSuccess(response, { user: session.user, csrfToken }, "Signed in successfully");
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = (_request, response) => {
  const options = cookieOptions();
  response.clearCookie(authCookieName, { ...options, httpOnly: true });
  response.clearCookie(csrfCookieName, { ...options, httpOnly: false });
  sendSuccess(response, null, "Signed out successfully");
};

export const currentUser: RequestHandler = async (request, response, next) => {
  try {
    const csrfToken = typeof request.cookies?.[csrfCookieName] === "string" ? request.cookies[csrfCookieName] as string : randomBytes(32).toString("hex");
    if (!request.cookies?.[csrfCookieName]) {
      response.cookie(csrfCookieName, csrfToken, { ...cookieOptions(), httpOnly: false });
    }
    const user = await getPublicUser(request.auth!.id);
    sendSuccess(response, { user, csrfToken });
  } catch (error) {
    next(error);
  }
};
