
import "dotenv/config";
import { z } from "zod";

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    PORT: z.coerce.number().int().min(1).max(65535).default(5000),

    MONGODB_URI: z
      .string()
      .regex(
        /^mongodb(?:\+srv)?:\/\//,
        "must be a MongoDB connection URI",
      ),

    CLIENT_ORIGIN: z
      .string()
      .default("http://localhost:5173")
      .transform((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.string().url()).min(1)),

    JWT_SECRET: z
      .string()
      .min(32)
      .refine(
        (value) => !value.toLowerCase().includes("replace_with"),
        "must be a generated secret, not the example placeholder",
      ),

    JWT_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhd]$/, "must be a duration such as 15m or 1d")
      .default("1d"),

    COOKIE_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),

    COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).optional(),

    SEED_HOD_NAME: z
      .string()
      .trim()
      .min(1)
      .default("S. Raghavendra Rao"),

    SEED_HOD_EMAIL: z.string().email().optional(),

    SEED_HOD_PASSWORD: z.string().min(12).optional(),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && !value.COOKIE_SECURE) {
      context.addIssue({
        code: "custom",
        path: ["COOKIE_SECURE"],
        message: "must be true in production",
      });
    }

    if (
      value.COOKIE_SAME_SITE === "none" &&
      !value.COOKIE_SECURE
    ) {
      context.addIssue({
        code: "custom",
        path: ["COOKIE_SAME_SITE"],
        message: "none requires COOKIE_SECURE=true",
      });
    }

    if (
      value.NODE_ENV === "production" &&
      value.CLIENT_ORIGIN.some(
        (origin) => !origin.startsWith("https://"),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["CLIENT_ORIGIN"],
        message: "production client origins must use HTTPS",
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(
  input: NodeJS.ProcessEnv,
): Environment {
  const parsed = environmentSchema.safeParse(input);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map(
        (issue) =>
          `${issue.path.join(".") || "environment"}: ${issue.message}`,
      )
      .join("; ");

    throw new Error(`Invalid server environment: ${details}`);
  }

  return parsed.data;
}

export const env = parseEnvironment(process.env);
