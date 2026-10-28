import { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError.js";
import { AttendanceRecordModel } from "../attendance/attendance-record.model.js";
import { Student } from "../students/student.model.js";
import { Teacher } from "../teachers/teacher.model.js";
import { SchoolClass } from "./class.model.js";

async function classDtos(filter: Record<string, unknown> = {}) {
  const classes = await SchoolClass.find({ ...filter, isActive: true }).sort({ grade: 1, section: 1 }).lean();
  const ids = classes.map((item) => item._id);
  const teacherIds = classes.map((item) => item.teacherId).filter((id): id is Types.ObjectId => Boolean(id));
  const [teachers, groupedStudents] = await Promise.all([
    Teacher.find({ _id: { $in: teacherIds }, isActive: true }).select("name").lean(),
    Student.aggregate<{ _id: Types.ObjectId; gender: string; count: number }>([
      { $match: { classId: { $in: ids }, isActive: true } },
      { $group: { _id: { classId: "$classId", gender: "$gender" }, count: { $sum: 1 } } },
      { $project: { _id: "$_id.classId", gender: "$_id.gender", count: 1 } },
    ]),
  ]);
  const teacherNames = new Map(teachers.map((teacher) => [String(teacher._id), teacher.name]));
  const stats = new Map<string, { total: number; boys: number; girls: number }>();
  groupedStudents.forEach((item) => {
    const id = String(item._id);
    const current = stats.get(id) ?? { total: 0, boys: 0, girls: 0 };
    current.total += item.count;
    if (item.gender === "Male") current.boys += item.count;
    if (item.gender === "Female") current.girls += item.count;
    stats.set(id, current);
  });
  return classes.map((item) => ({
    id: String(item._id),
    name: item.name,
    grade: item.grade,
    section: item.section,
    teacherId: item.teacherId ? String(item.teacherId) : null,
    teacher: item.teacherId ? teacherNames.get(String(item.teacherId)) ?? "Unassigned" : "Unassigned",
    academicYear: item.academicYear,
    isActive: item.isActive,
    stats: stats.get(String(item._id)) ?? { total: 0, boys: 0, girls: 0 },
  }));
}

export async function listClasses(academicYear?: string) {
  return classDtos(academicYear ? { academicYear } : {});
}

export async function getClass(id: string) {
  const [schoolClass] = await classDtos({ _id: id });
  if (!schoolClass) throw new ApiError(404, "CLASS_NOT_FOUND", "Class was not found");
  return schoolClass;
}

async function validateTeacher(teacherId?: string) {
  if (!teacherId) return;
  const teacher = await Teacher.exists({ _id: teacherId, isActive: true });
  if (!teacher) throw new ApiError(400, "INVALID_TEACHER", "Select an active teacher for this class");
}

export async function createClass(input: Record<string, unknown>) {
  await validateTeacher(input.teacherId as string | undefined);
  const schoolClass = await SchoolClass.create({ ...input, name: input.name ?? `Grade ${input.grade}` });
  return getClass(String(schoolClass._id));
}

export async function updateClass(id: string, input: Record<string, unknown>) {
  await validateTeacher(input.teacherId as string | undefined);
  const schoolClass = await SchoolClass.findOneAndUpdate({ _id: id, isActive: true }, { $set: input }, { new: true, runValidators: true });
  if (!schoolClass) throw new ApiError(404, "CLASS_NOT_FOUND", "Class was not found");
  return getClass(String(schoolClass._id));
}

export async function listClassStudents(classId: string) {
  const schoolClass = await SchoolClass.findOne({ _id: classId, isActive: true }).lean();
  if (!schoolClass) throw new ApiError(404, "CLASS_NOT_FOUND", "Class was not found");
  const students = await Student.find({ classId: schoolClass._id, isActive: true }).sort({ rollNumber: 1, firstName: 1 }).lean();
  return students;
}

export async function classAttendanceCount(classId: string, sessionId: string) {
  return AttendanceRecordModel.countDocuments({ classId, sessionId });
}
