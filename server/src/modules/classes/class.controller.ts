import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { sendSuccess } from "../../utils/response.js";
import { createClass, getClass, listClasses, updateClass } from "./class.service.js";

export const list: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await listClasses(request.query.academicYear as string | undefined)));
export const getById: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await getClass(request.params.id)));
export const create: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await createClass(request.body), "Class created", 201));
export const update: RequestHandler = asyncHandler(async (request, response) => sendSuccess(response, await updateClass(request.params.id, request.body)));
