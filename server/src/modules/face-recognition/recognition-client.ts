import { env, type Environment } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { isValidEmbedding } from "./template-crypto.js";

export type RecognitionResult = { status: "ready"; embedding: number[]; modelId: string; modelVersion: string };
export type RecognitionReadinessReason = "configuration_missing" | "service_unavailable" | "service_auth_failed" | "model_not_ready" | "provider_protocol_error" | null;
export type RecognitionReadiness = { ready: boolean; modelConfigured: boolean; reason: RecognitionReadinessReason };

export function isRecognitionConfigured(configuration: Environment = env) {
  return Boolean(
    configuration.RECOGNITION_SERVICE_URL &&
    configuration.RECOGNITION_SERVICE_SECRET &&
    configuration.RECOGNITION_MODEL_ID && configuration.RECOGNITION_MODEL_ID !== "unconfigured" &&
    configuration.RECOGNITION_MODEL_VERSION && configuration.RECOGNITION_MODEL_VERSION !== "unconfigured" &&
    configuration.FACE_TEMPLATE_KEY,
  );
}

export async function recognitionHealth(configuration: Environment = env): Promise<RecognitionReadiness> {
  if (!isRecognitionConfigured(configuration)) return { ready: false, modelConfigured: false, reason: "configuration_missing" };
  try {
    const response = await fetch(new URL("/v1/health", configuration.RECOGNITION_SERVICE_URL!), { headers: { authorization: `Bearer ${configuration.RECOGNITION_SERVICE_SECRET!}` }, signal: AbortSignal.timeout(1500) });
    if (response.status === 401 || response.status === 403) return { ready: false, modelConfigured: true, reason: "service_auth_failed" };
    if (response.status >= 500) return { ready: false, modelConfigured: true, reason: "service_unavailable" };
    if (!response.ok) return { ready: false, modelConfigured: true, reason: "provider_protocol_error" };
    const result: unknown = await response.json().catch(() => null);
    if (typeof result !== "object" || result === null || !("ready" in result) || typeof result.ready !== "boolean") {
      return { ready: false, modelConfigured: true, reason: "provider_protocol_error" };
    }
    return result.ready
      ? { ready: true, modelConfigured: true, reason: null }
      : { ready: false, modelConfigured: true, reason: "model_not_ready" };
  } catch {
    return { ready: false, modelConfigured: true, reason: "service_unavailable" };
  }
}

export async function createEmbedding(image: { mimeType: string; data: string }): Promise<RecognitionResult> {
  if (!isRecognitionConfigured()) {
    throw new ApiError(503, "RECOGNITION_NOT_CONFIGURED", "Face recognition is unavailable until a licensed model is configured");
  }
  let response: Response;
  try {
    response = await fetch(new URL("/v1/embedding", env.RECOGNITION_SERVICE_URL), {
      method: "POST", headers: { authorization: `Bearer ${env.RECOGNITION_SERVICE_SECRET}`, "content-type": "application/json" },
      body: JSON.stringify(image), signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new ApiError(503, "RECOGNITION_SERVICE_UNAVAILABLE", "Face recognition service is unavailable. Try again later.");
  }
  if (response.status === 401 || response.status === 403) throw new ApiError(502, "RECOGNITION_SERVICE_AUTH_FAILED", "Recognition service authentication failed");
  if ([400, 413, 422].includes(response.status)) throw new ApiError(400, "INVALID_RECOGNITION_REQUEST", "The captured image is invalid or unsupported");
  if (response.status >= 500) throw new ApiError(503, "RECOGNITION_SERVICE_UNAVAILABLE", "Face recognition service is unavailable. Try again later.");
  if (!response.ok) throw new ApiError(502, "RECOGNITION_PROVIDER_PROTOCOL_ERROR", "Recognition service returned an unexpected response");
  const result: unknown = await response.json().catch(() => null);
  if (typeof result !== "object" || result === null || !("embedding" in result) || !("modelId" in result) || !("modelVersion" in result)) throw new ApiError(502, "INVALID_RECOGNITION_RESPONSE", "Recognition service returned an invalid result");
  const output = result as { embedding: unknown; modelId: unknown; modelVersion: unknown };
  if (!isValidEmbedding(output.embedding) || output.modelId !== env.RECOGNITION_MODEL_ID || output.modelVersion !== env.RECOGNITION_MODEL_VERSION) throw new ApiError(502, "INVALID_RECOGNITION_RESPONSE", "Recognition service returned an invalid result");
  const norm = Math.sqrt(output.embedding.reduce((sum, value) => sum + value * value, 0));
  if (Math.abs(norm - 1) > 0.02) throw new ApiError(502, "INVALID_RECOGNITION_RESPONSE", "Recognition service returned an invalid result");
  return { status: "ready", embedding: output.embedding, modelId: String(output.modelId), modelVersion: String(output.modelVersion) };
}
