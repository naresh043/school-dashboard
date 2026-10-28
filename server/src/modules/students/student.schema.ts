import { z } from "zod";
import { genders } from "./student.model.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "must be a valid MongoDB ObjectId");
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const studentCreateSchema = z.object({
  studentCode: z.string().trim().min(1).max(40),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(100),
  displayName: optionalText(180),
  gender: z.enum(genders).optional(),
  dateOfBirth: z.string().datetime().optional(),
  classId: objectId,
  section: optionalText(20),
  rollNumber: z.number().int().positive().optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: optionalText(40),
  guardianName: optionalText(120),
  guardianPhone: optionalText(40),
  avatarUrl: z.string().url().max(2048).optional(),
}).strict();

export const studentUpdateSchema = studentCreateSchema.partial().strict().refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const studentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  classId: objectId.optional(),
  gender: z.enum(genders).optional(),
  sortBy: z.enum(["rollNumber", "studentCode", "name", "gender", "createdAt"]).default("rollNumber"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
}).strict();

export const studentIdParamsSchema = z.object({ id: objectId }).strict();
