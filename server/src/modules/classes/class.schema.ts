import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
export const classCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  grade: z.number().int().min(1).max(12),
  section: z.string().trim().min(1).max(20),
  teacherId: objectId.optional(),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/),
}).strict();
export const classUpdateSchema = classCreateSchema.partial().strict().refine((value) => Object.keys(value).length > 0, "At least one field must be provided");
export const classIdParamsSchema = z.object({ id: objectId }).strict();
export const classListQuerySchema = z.object({ academicYear: z.string().regex(/^\d{4}-\d{4}$/).optional() }).strict();
