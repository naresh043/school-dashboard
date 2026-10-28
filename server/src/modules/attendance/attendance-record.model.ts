import mongoose, { Schema, type InferSchemaType } from "mongoose";

const attendanceRecordSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true },
  sessionId: { type: Schema.Types.ObjectId, ref: "AttendanceSession", required: true },
  status: { type: String, enum: ["present", "absent", "late"], required: true },
  method: { type: String, enum: ["manual"], required: true, default: "manual" },
  markedAt: { type: Date },
  markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  remarks: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

attendanceRecordSchema.index({ studentId: 1, sessionId: 1 }, { unique: true });
attendanceRecordSchema.index({ classId: 1, sessionId: 1, status: 1 });

export type AttendanceRecord = InferSchemaType<typeof attendanceRecordSchema>;
export const AttendanceRecordModel = (mongoose.models.AttendanceRecord as mongoose.Model<AttendanceRecord> | undefined) ?? mongoose.model<AttendanceRecord>("AttendanceRecord", attendanceRecordSchema);
