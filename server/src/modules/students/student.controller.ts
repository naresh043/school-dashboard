import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { sendSuccess } from "../../utils/response.js";
import { createStudent, deactivateStudent, getStudent, listStudents, updateStudent } from "./student.service.js";

export const list: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await listStudents(request.query as never)));
export const getById: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await getStudent(request.params.id)));
export const create: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await createStudent(request.body), "Student created", 201));
export const update: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await updateStudent(request.params.id, request.body)));
export const deactivate: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await deactivateStudent(request.params.id), "Student deactivated"));
