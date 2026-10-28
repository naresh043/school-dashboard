
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

    FACE_RECOGNITION_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    RECOGNITION_SERVICE_URL: z.string().url().optional(),
    RECOGNITION_SERVICE_SECRET: z.string().min(32).optional(),
    RECOGNITION_MODEL_ID: z.string().trim().min(1).optional(),
    RECOGNITION_MODEL_VERSION: z.string().trim().min(1).optional(),
    FACE_MATCH_THRESHOLD: z.coerce.number().min(-1).max(1).default(0.7),
    FACE_TEMPLATE_KEY: z.string().optional(),
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

    if (value.NODE_ENV === "production" && value.FACE_RECOGNITION_ENABLED) {
      for (const key of ["RECOGNITION_SERVICE_URL", "RECOGNITION_SERVICE_SECRET", "RECOGNITION_MODEL_ID", "RECOGNITION_MODEL_VERSION", "FACE_TEMPLATE_KEY"] as const) {
        if (!value[key]) context.addIssue({ code: "custom", path: [key], message: "is required in production before face recognition can be enabled" });
      }
      for (const key of ["RECOGNITION_MODEL_ID", "RECOGNITION_MODEL_VERSION"] as const) {
        if (value[key]?.toLowerCase() === "unconfigured" || value[key]?.toLowerCase().includes("replace_with")) {
          context.addIssue({ code: "custom", path: [key], message: "must name an authorized, configured recognition model in production" });
        }
      }
      if (value.RECOGNITION_SERVICE_SECRET?.toLowerCase().includes("replace_with")) {
        context.addIssue({ code: "custom", path: ["RECOGNITION_SERVICE_SECRET"], message: "must not be the example placeholder in production" });
      }
      if (value.RECOGNITION_SERVICE_URL && !value.RECOGNITION_SERVICE_URL.startsWith("https://")) {
        context.addIssue({ code: "custom", path: ["RECOGNITION_SERVICE_URL"], message: "must use HTTPS in production" });
      }
    }
    if (value.FACE_RECOGNITION_ENABLED && value.RECOGNITION_SERVICE_SECRET && value.RECOGNITION_SERVICE_SECRET.length < 32) {
      context.addIssue({ code: "custom", path: ["RECOGNITION_SERVICE_SECRET"], message: "must be at least 32 characters" });
    }
    if (value.FACE_RECOGNITION_ENABLED && value.FACE_TEMPLATE_KEY) {
      try {
        if (!/^[A-Za-z0-9+/]{43}=$/.test(value.FACE_TEMPLATE_KEY) || Buffer.from(value.FACE_TEMPLATE_KEY, "base64").length !== 32) throw new Error();
      } catch {
        context.addIssue({ code: "custom", path: ["FACE_TEMPLATE_KEY"], message: "must be a base64-encoded 32-byte AES-256 key" });
      }
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
  const recognitionEnabled = input.FACE_RECOGNITION_ENABLED === "true";
  const schemaInput = recognitionEnabled ? input : {
    ...input,
    RECOGNITION_SERVICE_URL: undefined,
    RECOGNITION_SERVICE_SECRET: undefined,
    RECOGNITION_MODEL_ID: undefined,
    RECOGNITION_MODEL_VERSION: undefined,
    FACE_TEMPLATE_KEY: undefined,
    FACE_MATCH_THRESHOLD: undefined,
  };
  const parsed = environmentSchema.safeParse(schemaInput);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map(
        (issue) =>
          `${issue.path.join(".") || "environment"}: ${issue.message}`,
      )
      .join("; ");

    throw new Error(`Invalid server environment: ${details}`);
  }

  if (parsed.data.NODE_ENV === "production" && parsed.data.FACE_RECOGNITION_ENABLED && input.FACE_MATCH_THRESHOLD === undefined) {
    throw new Error("Invalid server environment: FACE_MATCH_THRESHOLD must be explicitly set from an authorized evaluation before production use");
  }

  return parsed.data;
}

export const env = parseEnvironment(process.env);
