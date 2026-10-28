import mongoose, { Schema, type InferSchemaType } from "mongoose";

const classSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  grade: { type: Number, required: true, min: 1, max: 12, index: true },
  section: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
  teacherId: { type: Schema.Types.ObjectId, ref: "Teacher" },
  academicYear: { type: String, required: true, trim: true, match: /^\d{4}-\d{4}$/ },
  isActive: { type: Boolean, default: true, index: true },
  isDemo: { type: Boolean, default: false, select: false },
}, { timestamps: true });

classSchema.index({ grade: 1, section: 1, academicYear: 1 }, { unique: true });

export type ClassRecord = InferSchemaType<typeof classSchema>;
export const SchoolClass = (mongoose.models.SchoolClass as mongoose.Model<ClassRecord> | undefined) ?? mongoose.model<ClassRecord>("SchoolClass", classSchema);
