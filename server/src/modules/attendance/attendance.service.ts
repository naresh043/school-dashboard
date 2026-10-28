import { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError.js";
import { SchoolClass } from "../classes/class.model.js";
import { Student } from "../students/student.model.js";
import { AttendanceRecordModel } from "./attendance-record.model.js";
import { AttendanceSession } from "./attendance-session.model.js";

const toSessionDto = (session: Record<string, unknown>) => ({
  id: String(session._id),
  classId: String(session.classId),
  sessionDate: new Date(String(session.sessionDate)).toISOString().slice(0, 10),
  sessionType: session.sessionType,
  status: session.status,
  createdAt: session.createdAt,
});

export async function createAttendanceSession(input: { classId: string; sessionDate: string; sessionType?: string }, userId: string) {
  const schoolClass = await SchoolClass.findOne({ _id: input.classId, isActive: true }).select("_id").lean();
  if (!schoolClass) throw new ApiError(404, "CLASS_NOT_FOUND", "Class was not found");
  const date = new Date(`${input.sessionDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.sessionDate) {
    throw new ApiError(400, "INVALID_SESSION_DATE", "Enter a valid session date");
  }
  const session = await AttendanceSession.create({ classId: schoolClass._id, sessionDate: date, sessionType: input.sessionType, createdBy: new Types.ObjectId(userId) });
  return toSessionDto(session.toObject() as unknown as Record<string, unknown>);
}

export async function listAttendanceSessions(classId?: string) {
  const filter = classId ? { classId: new Types.ObjectId(classId) } : {};
  const sessions = await AttendanceSession.find(filter).sort({ sessionDate: -1, createdAt: -1 }).limit(100).lean();
  const classIds = [...new Set(sessions.map((session) => String(session.classId)))];
  const classes = await SchoolClass.find({ _id: { $in: classIds } }).select("name grade section").lean();
  const classMap = new Map(classes.map((item) => [String(item._id), item]));
  const counts = await AttendanceRecordModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { sessionId: { $in: sessions.map((session) => session._id) } } },
    { $group: { _id: "$sessionId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
  return sessions.map((session) => ({
    ...toSessionDto(session),
    schoolClass: classMap.get(String(session.classId)) ?? null,
    markedCount: countMap.get(String(session._id)) ?? 0,
  }));
}

async function getSessionDocument(sessionId: string) {
  const session = await AttendanceSession.findById(sessionId).lean();
  if (!session) throw new ApiError(404, "SESSION_NOT_FOUND", "Attendance session was not found");
  return session;
}

export async function getAttendanceSession(sessionId: string) {
  const session = await getSessionDocument(sessionId);
  const [schoolClass, summary] = await Promise.all([
    SchoolClass.findById(session.classId).select("name grade section").lean(),
    AttendanceRecordModel.aggregate<{ _id: string; count: number }>([
      { $match: { sessionId: session._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);
  const counts = new Map(summary.map((item) => [item._id, item.count]));
  return {
    ...toSessionDto(session),
    schoolClass,
    summary: { present: counts.get("present") ?? 0, absent: counts.get("absent") ?? 0, late: counts.get("late") ?? 0, marked: summary.reduce((total, item) => total + item.count, 0) },
  };
}

export async function getAttendanceRecords(sessionId: string) {
  const session = await getSessionDocument(sessionId);
  const [students, records] = await Promise.all([
    Student.find({ classId: session.classId, isActive: true }).sort({ rollNumber: 1, firstName: 1 }).lean(),
    AttendanceRecordModel.find({ sessionId: session._id }).lean(),
  ]);
  const recordMap = new Map(records.map((record) => [String(record.studentId), record]));
  return students.map((student) => {
    const record = recordMap.get(String(student._id));
    return {
      studentId: String(student._id),
      studentCode: student.studentCode,
      displayName: student.displayName || `${student.firstName} ${student.lastName}`.trim(),
      rollNumber: student.rollNumber,
      status: record?.status ?? "unmarked",
      method: record?.method ?? null,
      markedAt: record?.markedAt ?? null,
      remarks: record?.remarks ?? null,
    };
  });
}

export async function setManualAttendance(sessionId: string, studentId: string, input: { status: "present" | "absent" | "late"; remarks?: string }, userId: string) {
  const session = await getSessionDocument(sessionId);
  if (session.status !== "open") throw new ApiError(409, "SESSION_CLOSED", "This attendance session is closed");
  const student = await Student.findOne({ _id: studentId, classId: session.classId, isActive: true }).select("_id classId").lean();
  if (!student) throw new ApiError(400, "STUDENT_NOT_IN_CLASS", "Student does not belong to this class or is inactive");
  const update = {
    $set: {
      status: input.status,
      method: "manual" as const,
      markedBy: new Types.ObjectId(userId),
      remarks: input.remarks,
      ...(input.status === "absent" ? {} : { markedAt: new Date() }),
    },
    ...(input.status === "absent" ? { $unset: { markedAt: 1 } } : {}),
    $setOnInsert: { studentId: student._id, classId: session.classId, sessionId: session._id },
  };
  try {
    const record = await AttendanceRecordModel.findOneAndUpdate({ studentId: student._id, sessionId: session._id }, update, { new: true, upsert: true, runValidators: true }).lean();
    return { id: String(record!._id), studentId: String(record!.studentId), classId: String(record!.classId), sessionId: String(record!.sessionId), status: record!.status, method: record!.method, markedAt: record!.markedAt ?? null, markedBy: String(record!.markedBy), remarks: record!.remarks ?? null };
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === 11000)) throw error;
    const existing = await AttendanceRecordModel.findOneAndUpdate({ studentId: student._id, sessionId: session._id }, update.$set, { new: true, runValidators: true }).lean();
    if (!existing) throw new ApiError(409, "DUPLICATE_ATTENDANCE", "Attendance was updated concurrently. Retry the request.");
    return { id: String(existing._id), studentId: String(existing.studentId), classId: String(existing.classId), sessionId: String(existing.sessionId), status: existing.status, method: existing.method, markedAt: existing.markedAt ?? null, markedBy: String(existing.markedBy), remarks: existing.remarks ?? null };
  }
}
