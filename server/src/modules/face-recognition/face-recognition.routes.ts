import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, requireHeadOfDepartment } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { authorize, enroll, getEnrollment, health, identify, revoke } from "./face-recognition.controller.js";
import { authorizationSchema, enrollmentSchema, recognitionSchema, studentFaceParamsSchema } from "./face-recognition.schema.js";

const router = Router();
const imageRateLimit = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: "RATE_LIMITED", message: "Too many face requests. Try again shortly." } } });
router.get("/face-recognition/health", requireAuth, health);
router.put("/students/:studentId/face-authorization", requireAuth, requireHeadOfDepartment, validateRequest({ params: studentFaceParamsSchema, body: authorizationSchema }), authorize);
router.get("/students/:studentId/face-enrollment", requireAuth, requireHeadOfDepartment, validateRequest({ params: studentFaceParamsSchema }), getEnrollment);
router.post("/students/:studentId/face-enrollments", requireAuth, requireHeadOfDepartment, imageRateLimit, validateRequest({ params: studentFaceParamsSchema, body: enrollmentSchema }), enroll);
router.delete("/students/:studentId/face-enrollment", requireAuth, requireHeadOfDepartment, validateRequest({ params: studentFaceParamsSchema }), revoke);
router.post("/face-recognition/identify", requireAuth, requireHeadOfDepartment, imageRateLimit, validateRequest({ body: recognitionSchema }), identify);
export default router;
