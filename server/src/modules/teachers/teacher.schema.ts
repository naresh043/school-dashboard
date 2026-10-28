import { z } from "zod";
export const teacherIdParamsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }).strict();
