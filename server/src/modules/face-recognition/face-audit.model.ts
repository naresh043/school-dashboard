import mongoose, { Schema, type InferSchemaType } from "mongoose";

const schema = new Schema({
  action: { type: String, enum: ["enroll", "replace", "revoke", "recognition"], required: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  studentId: { type: Schema.Types.ObjectId, ref: "Student" },
  classId: { type: Schema.Types.ObjectId, ref: "SchoolClass" },
  outcome: { type: String, enum: ["completed", "service_unavailable", "enrolled", "revoked", "failed"] },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 * 2 });

export type FaceAuditRecord = InferSchemaType<typeof schema>;
export const FaceAuditEvent = (mongoose.models.FaceAuditEvent as mongoose.Model<FaceAuditRecord> | undefined) ?? mongoose.model<FaceAuditRecord>("FaceAuditEvent", schema);
