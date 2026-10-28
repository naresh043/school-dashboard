import jwt, { type JwtPayload } from "jsonwebtoken";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { User } from "../modules/auth/user.model.js";
import { ApiError } from "../utils/ApiError.js";

export const authCookieName = "gs_vm_access";
export const csrfCookieName = "gs_vm_csrf";

export function cookieOptions() {
  return {
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE ?? (env.COOKIE_SECURE ? "none" : "lax"),
    path: "/",
  } as const;
}

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    const token = request.cookies?.[authCookieName] as string | undefined;
    if (!token) throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Please sign in to continue");
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Please sign in to continue");
    }
    if (typeof payload.sub !== "string") throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Please sign in to continue");
    const user = await User.findById(payload.sub).select("role isActive").lean();
    if (!user?.isActive) throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Please sign in to continue");
    request.auth = { id: String(user._id), role: user.role };
    next();
  } catch (error) {
    next(error);
  }
};

export const requireHeadOfDepartment: RequestHandler = (request, _response, next) => {
  if (request.auth?.role !== "head-of-department") {
    next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action"));
    return;
  }
  next();
};
