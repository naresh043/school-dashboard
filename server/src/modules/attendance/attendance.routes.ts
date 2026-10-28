import { Router } from "express";
import { requireAuth, requireHeadOfDepartment } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { createSession, getSession, listRecords, listSessions, updateRecord } from "./attendance.controller.js";
import { attendanceRecordParamsSchema, createSessionSchema, sessionIdParamsSchema, sessionListQuerySchema, updateAttendanceSchema } from "./attendance.schema.js";

const router = Router();
router.use(requireAuth, requireHeadOfDepartment);
router.get("/sessions", validateRequest({ query: sessionListQuerySchema }), listSessions);
router.post("/sessions", validateRequest({ body: createSessionSchema }), createSession);
router.get("/sessions/:sessionId", validateRequest({ params: sessionIdParamsSchema }), getSession);
router.get("/sessions/:sessionId/records", validateRequest({ params: sessionIdParamsSchema }), listRecords);
router.put("/sessions/:sessionId/records/:studentId", validateRequest({ params: attendanceRecordParamsSchema, body: updateAttendanceSchema }), updateRecord);
export default router;
