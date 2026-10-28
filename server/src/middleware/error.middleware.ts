import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "The supplied data is invalid", details: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) } });
    return;
  }
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof mongoose.Error.CastError) {
    response.status(400).json({ success: false, error: { code: "INVALID_IDENTIFIER", message: "The supplied identifier is invalid" } });
    return;
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
    response.status(409).json({ success: false, error: { code: "DUPLICATE_RECORD", message: "A record with those unique details already exists" } });
    return;
  }
  console.error("Unhandled API error (details omitted to protect credentials and infrastructure configuration).");
  response.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred" } });
};
