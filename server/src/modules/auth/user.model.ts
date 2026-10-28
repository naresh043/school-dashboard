import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const roles = ["head-of-department"] as const;
export type Role = typeof roles[number];

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: roles, required: true },
  department: { type: String, trim: true, maxlength: 120, default: "Academic Administration" },
  isActive: { type: Boolean, default: true, index: true },
  isDemo: { type: Boolean, default: false, select: false },
}, { timestamps: true });

export type UserRecord = InferSchemaType<typeof userSchema>;
export const User = (mongoose.models.User as mongoose.Model<UserRecord> | undefined) ?? mongoose.model<UserRecord>("User", userSchema);
