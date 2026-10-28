import type { RequestHandler } from "express";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { sendSuccess } from "../../utils/response.js";
import { Teacher } from "./teacher.model.js";

const teacherDto = (teacher: { _id: unknown; teacherCode: string; name: string; email?: string | null; phone?: string | null; department?: string | null }) => ({ id: String(teacher._id), teacherCode: teacher.teacherCode, name: teacher.name, email: teacher.email ?? null, phone: teacher.phone ?? null, department: teacher.department ?? null });
export const list: RequestHandler = asyncHandler(async (_request, response) => {
  const teachers = await Teacher.find({ isActive: true }).sort({ name: 1 }).lean();
  sendSuccess(response, teachers.map(teacherDto));
});
export const getById: RequestHandler = asyncHandler(async (request, response) => {
  const teacher = await Teacher.findOne({ _id: request.params.id, isActive: true }).lean();
  if (!teacher) throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher was not found");
  sendSuccess(response, teacherDto(teacher));
});
