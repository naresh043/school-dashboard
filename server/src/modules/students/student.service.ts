import { Types, type FilterQuery } from "mongoose";
import { ApiError } from "../../utils/ApiError.js";
import { paginationMeta, type PaginationInput } from "../../utils/pagination.js";
import { SchoolClass } from "../classes/class.model.js";
import { Student } from "./student.model.js";

interface StudentListInput extends PaginationInput {
  search?: string;
  classId?: string;
  gender?: string;
  sortBy: "rollNumber" | "studentCode" | "name" | "gender" | "createdAt";
  sortOrder: "asc" | "desc";
}

export function studentDto(student: Record<string, unknown>) {
  const firstName = String(student.firstName ?? "");
  const lastName = String(student.lastName ?? "");
  return {
    id: String(student._id),
    studentCode: student.studentCode,
    firstName,
    lastName,
    displayName: student.displayName || `${firstName} ${lastName}`.trim(),
    gender: student.gender,
    dateOfBirth: student.dateOfBirth,
    classId: String(student.classId),
    section: student.section,
    rollNumber: student.rollNumber,
    email: student.email,
    phone: student.phone,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    avatarUrl: student.avatarUrl,
    isActive: student.isActive,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
}

export async function listStudents(input: StudentListInput) {
  const filter: FilterQuery<typeof Student> = { isActive: true };
  if (input.classId) filter.classId = new Types.ObjectId(input.classId);
  if (input.gender) filter.gender = input.gender;
  if (input.search) {
    const escaped = input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const search = new RegExp(escaped, "i");
    const numericRoll = /^\d+$/.test(input.search) ? Number(input.search) : undefined;
    filter.$or = [{ studentCode: search }, { firstName: search }, { lastName: search }, { displayName: search }, ...(numericRoll ? [{ rollNumber: numericRoll }] : [])];
  }
  const sortField = input.sortBy === "name" ? "firstName" : input.sortBy;
  const direction: 1 | -1 = input.sortOrder === "asc" ? 1 : -1;
  const sort = { [sortField]: direction, _id: 1 as const };
  const skip = (input.page - 1) * input.limit;
  const [students, total] = await Promise.all([
    Student.find(filter).sort(sort).skip(skip).limit(input.limit).lean(),
    Student.countDocuments(filter),
  ]);
  return { students: students.map((student) => studentDto(student)), pagination: paginationMeta(input, total) };
}

export async function getStudent(id: string) {
  const student = await Student.findOne({ _id: id, isActive: true }).lean();
  if (!student) throw new ApiError(404, "STUDENT_NOT_FOUND", "Student was not found");
  return studentDto(student);
}

async function assertClass(classId: string) {
  const schoolClass = await SchoolClass.findOne({ _id: classId, isActive: true }).select("_id section").lean();
  if (!schoolClass) throw new ApiError(400, "INVALID_CLASS", "Select an active class for this student");
  return schoolClass;
}

export async function createStudent(input: Record<string, unknown>) {
  const schoolClass = await assertClass(String(input.classId));
  const student = await Student.create({ ...input, section: input.section ?? schoolClass.section, ...(input.dateOfBirth ? { dateOfBirth: new Date(String(input.dateOfBirth)) } : {}) });
  return studentDto(student.toObject() as unknown as Record<string, unknown>);
}

export async function updateStudent(id: string, input: Record<string, unknown>) {
  if (input.classId) {
    const schoolClass = await assertClass(String(input.classId));
    input.section = schoolClass.section;
  }
  if (input.dateOfBirth) input.dateOfBirth = new Date(String(input.dateOfBirth));
  const student = await Student.findOneAndUpdate({ _id: id, isActive: true }, { $set: input }, { new: true, runValidators: true }).lean();
  if (!student) throw new ApiError(404, "STUDENT_NOT_FOUND", "Student was not found");
  return studentDto(student);
}

export async function deactivateStudent(id: string) {
  const student = await Student.findOneAndUpdate({ _id: id, isActive: true }, { $set: { isActive: false } }, { new: true }).lean();
  if (!student) throw new ApiError(404, "STUDENT_NOT_FOUND", "Student was not found");
  return { id: String(student._id), isActive: false };
}
