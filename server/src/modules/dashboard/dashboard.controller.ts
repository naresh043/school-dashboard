import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { sendSuccess } from "../../utils/response.js";
import { getDashboardSummary } from "./dashboard.service.js";

export const summary: RequestHandler = asyncHandler(async (_request, response) => sendSuccess(response, await getDashboardSummary()));
