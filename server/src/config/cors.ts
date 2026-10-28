import type { CorsOptions } from "cors";

export function createCorsOptions(allowedOrigins: string[]): CorsOptions {
  return {
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  };
}
