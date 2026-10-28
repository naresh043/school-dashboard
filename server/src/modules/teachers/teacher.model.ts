import mongoose, { Schema, type InferSchemaType } from "mongoose";

const teacherSchema = new Schema({
  teacherCode: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 40 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 40 },
  department: { type: String, trim: true, maxlength: 120 },
  isActive: { type: Boolean, default: true, index: true },
  isDemo: { type: Boolean, default: false, select: false },
}, { timestamps: true });

teacherSchema.index({ email: 1 }, { unique: true, sparse: true });

export type TeacherRecord = InferSchemaType<typeof teacherSchema>;
export const Teacher = (mongoose.models.Teacher as mongoose.Model<TeacherRecord> | undefined) ?? mongoose.model<TeacherRecord>("Teacher", teacherSchema);
