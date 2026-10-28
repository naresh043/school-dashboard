import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { currentUser, login, logout } from "./auth.controller.js";
import { loginSchema } from "./auth.schema.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many sign-in attempts. Try again later.",
    },
  },
});

router.post(
  "/login",
  loginLimiter,
  validateRequest({ body: loginSchema }),
  asyncHandler(login),
);
router.post("/logout", requireAuth, asyncHandler(logout));
router.get("/me", requireAuth, asyncHandler(currentUser));

export default router;
