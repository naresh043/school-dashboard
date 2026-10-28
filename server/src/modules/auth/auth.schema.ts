import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
}).strict();

export const authIdSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }).strict();
