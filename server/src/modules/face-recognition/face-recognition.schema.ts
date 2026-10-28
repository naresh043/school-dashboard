import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const image = z.object({
  mimeType: z.enum(["image/jpeg", "image/png"]),
  data: z.string().min(1).max(2_800_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
}).strict().refine((value) => Buffer.from(value.data, "base64").length >= 1024 && Buffer.from(value.data, "base64").length <= 2_000_000, "Image payload must be between 1 KB and 2 MB");

export const studentFaceParamsSchema = z.object({ studentId: objectId }).strict();
export const authorizationSchema = z.object({ authorizationReference: z.string().trim().min(3).max(160) }).strict();
export const enrollmentSchema = z.object({ image }).strict();
export const recognitionSchema = z.object({ classId: objectId, image }).strict();
