import type { Response } from "express";

export function sendSuccess<T>(response: Response, data: T, message = "Request completed successfully", status = 200) {
  return response.status(status).json({ success: true, data, message });
}
