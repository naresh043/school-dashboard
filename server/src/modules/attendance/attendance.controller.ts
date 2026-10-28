import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { sendSuccess } from "../../utils/response.js";
import { createAttendanceSession, getAttendanceRecords, getAttendanceSession, listAttendanceSessions, setManualAttendance } from "./attendance.service.js";

export const listSessions: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await listAttendanceSessions(request.query.classId as string | undefined)));
export const createSession: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await createAttendanceSession(request.body, request.auth!.id), "Attendance session created", 201));
export const getSession: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await getAttendanceSession(request.params.sessionId)));
export const listRecords: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await getAttendanceRecords(request.params.sessionId)));
export const updateRecord: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await setManualAttendance(request.params.sessionId, request.params.studentId, request.body, request.auth!.id), "Manual attendance saved"));
