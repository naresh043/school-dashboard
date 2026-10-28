import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";

function key() {
  if (!env.FACE_RECOGNITION_ENABLED) throw new ApiError(503, "FACE_RECOGNITION_DISABLED", "Face recognition is disabled for this deployment");
  if (!env.FACE_TEMPLATE_KEY) throw new ApiError(503, "TEMPLATE_ENCRYPTION_UNAVAILABLE", "Face enrollment is not configured");
  const decoded = Buffer.from(env.FACE_TEMPLATE_KEY, "base64");
  if (decoded.length !== 32) throw new ApiError(503, "TEMPLATE_ENCRYPTION_UNAVAILABLE", "Face enrollment is not configured");
  return decoded;
}

export function encryptTemplate(embedding: number[]) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(embedding), "utf8"), cipher.final()]);
  return { encryptedTemplate: encrypted.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64"), encryptionKeyVersion: "v1" };
}

export function decryptTemplate(record: { encryptedTemplate: string; iv: string; authTag: string }): number[] {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(record.iv, "base64"));
    decipher.setAuthTag(Buffer.from(record.authTag, "base64"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(record.encryptedTemplate, "base64")), decipher.final()]).toString("utf8");
    const parsed: unknown = JSON.parse(plaintext);
    if (!isValidEmbedding(parsed)) throw new Error("invalid template");
    return parsed;
  } catch {
    throw new ApiError(503, "TEMPLATE_UNAVAILABLE", "Stored face enrollment is temporarily unavailable");
  }
}

export function isValidEmbedding(value: unknown): value is number[] {
  return Array.isArray(value) && value.length >= 32 && value.length <= 4096 && value.every((item) => typeof item === "number" && Number.isFinite(item));
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (!isValidEmbedding(left) || !isValidEmbedding(right) || left.length !== right.length) throw new ApiError(502, "INVALID_RECOGNITION_RESPONSE", "Recognition service returned an invalid result");
  const dot = left.reduce((sum, value, index) => sum + value * right[index]!, 0);
  const normLeft = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const normRight = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
  if (!normLeft || !normRight) throw new ApiError(502, "INVALID_RECOGNITION_RESPONSE", "Recognition service returned an invalid result");
  return dot / (normLeft * normRight);
}

export function classifyCandidates(candidates: Array<{ studentId: string; score: number }>, threshold: number, margin = 0.05) {
  const ordered = [...candidates].sort((a, b) => b.score - a.score);
  const best = ordered[0];
  if (!best || best.score < threshold) return { outcome: "no_match" as const };
  if (ordered[1] && best.score - ordered[1].score < margin) return { outcome: "uncertain" as const };
  return { outcome: "match" as const, studentId: best.studentId };
}
