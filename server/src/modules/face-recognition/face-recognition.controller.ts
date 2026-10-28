import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { sendSuccess } from "../../utils/response.js";
import { enrollStudent, faceRecognitionHealth, getEnrollmentStatus, identifyStudent, revokeEnrollment, setFaceAuthorization } from "./face-recognition.service.js";

export const health: RequestHandler = asyncHandler(async (_request, response) => sendSuccess(response, await faceRecognitionHealth()));
export const authorize: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await setFaceAuthorization(request.params.studentId!, request.body.authorizationReference, request.auth!.id), "Authorization reference recorded"));
export const getEnrollment: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await getEnrollmentStatus(request.params.studentId!)));
export const enroll: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await enrollStudent(request.params.studentId!, request.body.image, request.auth!.id), "Face enrollment saved"));
export const revoke: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await revokeEnrollment(request.params.studentId!, request.auth!.id), "Face enrollment revoked"));
export const identify: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await identifyStudent(request.body.classId, request.body.image, request.auth!.id)));
