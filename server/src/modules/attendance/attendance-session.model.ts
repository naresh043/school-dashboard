import mongoose, { Schema, type InferSchemaType } from "mongoose";

const attendanceSessionSchema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true, index: true },
  sessionDate: { type: Date, required: true },
  sessionType: { type: String, trim: true, maxlength: 80, default: "Daily attendance" },
  status: { type: String, enum: ["open", "closed"], default: "open", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

attendanceSessionSchema.index({ classId: 1, sessionDate: 1 }, { unique: true });

export type AttendanceSessionRecord = InferSchemaType<typeof attendanceSessionSchema>;
export const AttendanceSession = (mongoose.models.AttendanceSession as mongoose.Model<AttendanceSessionRecord> | undefined) ?? mongoose.model<AttendanceSessionRecord>("AttendanceSession", attendanceSessionSchema);
