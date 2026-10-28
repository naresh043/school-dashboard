import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const genders = ["Male", "Female", "Other", "Not specified"] as const;

const studentSchema = new Schema({
  studentCode: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 40 },
  firstName: { type: String, required: true, trim: true, maxlength: 80 },
  lastName: { type: String, required: true, trim: true, maxlength: 100 },
  displayName: { type: String, trim: true, maxlength: 180 },
  gender: { type: String, enum: genders, default: "Not specified" },
  dateOfBirth: { type: Date },
  classId: { type: Schema.Types.ObjectId, ref: "SchoolClass", required: true, index: true },
  section: { type: String, trim: true, uppercase: true, maxlength: 20 },
  rollNumber: { type: Number, min: 1 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 40 },
  guardianName: { type: String, trim: true, maxlength: 120 },
  guardianPhone: { type: String, trim: true, maxlength: 40 },
  avatarUrl: { type: String, trim: true, maxlength: 2048 },
  isActive: { type: Boolean, default: true, index: true },
  isDemo: { type: Boolean, default: false, select: false },
}, { timestamps: true });

studentSchema.index({ classId: 1, rollNumber: 1 });
studentSchema.index({ firstName: 1, lastName: 1 });

export type StudentRecord = InferSchemaType<typeof studentSchema>;
export const Student = (mongoose.models.Student as mongoose.Model<StudentRecord> | undefined) ?? mongoose.model<StudentRecord>("Student", studentSchema);
