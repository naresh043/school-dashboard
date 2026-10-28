import mongoose, { Schema, type InferSchemaType } from "mongoose";

const schema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, unique: true, index: true },
  encryptedTemplate: { type: String, required: true, select: false },
  iv: { type: String, required: true, select: false },
  authTag: { type: String, required: true, select: false },
  encryptionKeyVersion: { type: String, required: true },
  modelId: { type: String, required: true },
  modelVersion: { type: String, required: true },
  embeddingDimensions: { type: Number, required: true },
  authorizationReference: { type: String, required: true },
  enrolledBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  enrolledAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: false });

export type FaceEnrollmentRecord = InferSchemaType<typeof schema>;
export const FaceEnrollment = (mongoose.models.FaceEnrollment as mongoose.Model<FaceEnrollmentRecord> | undefined) ?? mongoose.model<FaceEnrollmentRecord>("FaceEnrollment", schema);
