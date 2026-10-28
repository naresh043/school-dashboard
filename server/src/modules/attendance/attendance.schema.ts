import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
export const createSessionSchema = z.object({
  classId: objectId,
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sessionType: z.string().trim().max(80).optional(),
}).strict();
export const sessionListQuerySchema = z.object({ classId: objectId.optional() }).strict();
export const sessionIdParamsSchema = z.object({ sessionId: objectId }).strict();
export const attendanceRecordParamsSchema = z.object({ sessionId: objectId, studentId: objectId }).strict();
export const updateAttendanceSchema = z.object({
  status: z.enum(["present", "absent", "late"]),
  method: z.literal("manual").optional(),
  remarks: z.string().trim().max(500).optional(),
}).strict();
