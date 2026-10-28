import { Types } from "mongoose";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { Student } from "../students/student.model.js";
import { SchoolClass } from "../classes/class.model.js";
import { FaceAuditEvent } from "./face-audit.model.js";
import { FaceEnrollment } from "./face-enrollment.model.js";
import { createEmbedding, recognitionHealth, type RecognitionResult } from "./recognition-client.js";
import { classifyCandidates, cosineSimilarity, decryptTemplate, encryptTemplate } from "./template-crypto.js";

async function authorizedStudent(studentId: string) {
  const student = await Student.findOne({ _id: studentId, isActive: true }).select("studentCode displayName firstName lastName faceAuthorization").lean();
  if (!student) throw new ApiError(404, "STUDENT_NOT_FOUND", "Active student was not found");
  if (student.faceAuthorization?.status !== "authorized" || !student.faceAuthorization.reference) throw new ApiError(403, "AUTHORIZATION_REQUIRED", "An approved authorization reference is required before face enrollment");
  return student;
}

export async function setFaceAuthorization(studentId: string, reference: string, actorId: string) {
  const student = await Student.findOneAndUpdate({ _id: studentId, isActive: true }, { $set: { "faceAuthorization.status": "authorized", "faceAuthorization.reference": reference, "faceAuthorization.authorizedBy": new Types.ObjectId(actorId), "faceAuthorization.authorizedAt": new Date() }, $unset: { "faceAuthorization.revokedAt": 1 } }, { new: true }).select("_id").lean();
  if (!student) throw new ApiError(404, "STUDENT_NOT_FOUND", "Active student was not found");
  return { authorizationRecorded: true };
}

export async function getEnrollmentStatus(studentId: string) {
  const [student, enrollment] = await Promise.all([
    Student.findOne({ _id: studentId, isActive: true }).select("faceAuthorization.status").lean(),
    FaceEnrollment.findOne({ studentId }).select("modelId modelVersion enrolledAt updatedAt").lean(),
  ]);
  if (!student) throw new ApiError(404, "STUDENT_NOT_FOUND", "Active student was not found");
  return { authorizationStatus: student.faceAuthorization?.status ?? "not-authorized", enrollment: enrollment ? { status: "active", enrolledAt: enrollment.enrolledAt, updatedAt: enrollment.updatedAt, modelId: enrollment.modelId, modelVersion: enrollment.modelVersion } : null };
}

export async function enrollStudent(studentId: string, image: { mimeType: string; data: string }, actorId: string) {
  const student = await authorizedStudent(studentId);
  const health = await recognitionHealth();
  if (!health.ready) {
    if (health.reason === "service_auth_failed") throw new ApiError(502, "RECOGNITION_SERVICE_AUTH_FAILED", "Recognition service authentication failed");
    if (health.reason === "provider_protocol_error") throw new ApiError(502, "RECOGNITION_PROVIDER_PROTOCOL_ERROR", "Recognition service returned an unexpected response");
    throw new ApiError(503, "RECOGNITION_SERVICE_UNAVAILABLE", "Enrollment is unavailable because the recognition model is not ready");
  }
  const result = await createEmbedding(image);
  const existing = await FaceEnrollment.findOne({ studentId }).select("_id").lean();
  const encrypted = encryptTemplate(result.embedding);
  await FaceEnrollment.findOneAndUpdate({ studentId }, {
    $set: { ...encrypted, modelId: result.modelId, modelVersion: result.modelVersion, embeddingDimensions: result.embedding.length, authorizationReference: student.faceAuthorization!.reference, enrolledBy: new Types.ObjectId(actorId), updatedAt: new Date() },
    $setOnInsert: { studentId: new Types.ObjectId(studentId), enrolledAt: new Date() },
  }, { upsert: true, new: true, runValidators: true });
  await FaceAuditEvent.create({ action: existing ? "replace" : "enroll", actorId: new Types.ObjectId(actorId), studentId: new Types.ObjectId(studentId), outcome: "enrolled" });
  return { status: existing ? "replaced" : "enrolled" };
}

export async function revokeEnrollment(studentId: string, actorId: string) {
  const student = await Student.findOneAndUpdate({ _id: studentId }, { $set: { "faceAuthorization.status": "revoked", "faceAuthorization.revokedAt": new Date() } }, { new: true }).select("_id").lean();
  if (!student) throw new ApiError(404, "STUDENT_NOT_FOUND", "Student was not found");
  const removed = await FaceEnrollment.findOneAndDelete({ studentId }).select("_id").lean();
  await FaceAuditEvent.create({ action: "revoke", actorId: new Types.ObjectId(actorId), studentId: new Types.ObjectId(studentId), outcome: "revoked" });
  return { revoked: true, enrollmentRemoved: Boolean(removed) };
}

export async function identifyStudent(classId: string, image: { mimeType: string; data: string }, actorId: string) {
  const auditBase = { action: "recognition" as const, actorId: new Types.ObjectId(actorId), classId: new Types.ObjectId(classId) };
  const schoolClass = await SchoolClass.findOne({ _id: classId, isActive: true }).select("_id").lean();
  if (!schoolClass) throw new ApiError(404, "CLASS_NOT_FOUND", "Active class was not found");
  const health = await recognitionHealth();
  if (!health.ready) {
    if (health.reason === "service_auth_failed" || health.reason === "provider_protocol_error") {
      await FaceAuditEvent.create({ ...auditBase, outcome: "failed" });
      if (health.reason === "service_auth_failed") throw new ApiError(502, "RECOGNITION_SERVICE_AUTH_FAILED", "Recognition service authentication failed");
      throw new ApiError(502, "RECOGNITION_PROVIDER_PROTOCOL_ERROR", "Recognition service returned an unexpected response");
    }
    await FaceAuditEvent.create({ ...auditBase, outcome: "service_unavailable" });
    return { outcome: "service_unavailable" as const };
  }
  let output: RecognitionResult;
  try {
    output = await createEmbedding(image);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 503) {
      await FaceAuditEvent.create({ ...auditBase, outcome: "service_unavailable" });
      return { outcome: "service_unavailable" as const };
    }
    await FaceAuditEvent.create({ ...auditBase, outcome: "failed" });
    throw error;
  }
  const students = await Student.find({ classId, isActive: true, "faceAuthorization.status": "authorized" }).select("studentCode displayName firstName lastName").lean();
  const studentIds = students.map((student) => student._id);
  const enrolled = await FaceEnrollment.find({ studentId: { $in: studentIds }, modelId: output.modelId, modelVersion: output.modelVersion }).select("+encryptedTemplate +iv +authTag studentId").lean();
  const eligibleIds = new Set(students.map((student) => String(student._id)));
  const candidates = enrolled.filter((item) => eligibleIds.has(String(item.studentId))).map((item) => ({ studentId: String(item.studentId), score: cosineSimilarity(output.embedding, decryptTemplate(item)) }));
  const result = classifyCandidates(candidates, env.FACE_MATCH_THRESHOLD);
  await FaceAuditEvent.create({ ...auditBase, outcome: "completed" });
  if (result.outcome !== "match") return result;
  const student = students.find((item) => String(item._id) === result.studentId)!;
  return { outcome: "match" as const, student: { id: String(student._id), studentCode: student.studentCode, name: student.displayName || `${student.firstName} ${student.lastName}`.trim() } };
}

export async function faceRecognitionHealth() {
  const result = await recognitionHealth();
  return { status: result.ready ? "ready" : "unavailable", modelConfigured: result.modelConfigured, reason: result.reason };
}
