export function isRecognitionReady(health) {
  return health?.status === "ready";
}

export function getRecognitionUnavailableMessage(health, failed = false) {
  if (isRecognitionReady(health)) return "";
  if (failed) return "The recognition service status could not be reached. Enrollment and identity recognition are disabled.";
  if (!health) return "Checking recognition service status…";
  if (health.reason === "model_not_ready" || health.reason === "configuration_missing") {
    return "The development recognition provider is active, but no licensed identity model is configured. Enrollment and identity recognition are disabled; local face detection still works.";
  }
  return "The recognition service is unavailable. Enrollment and identity recognition are disabled until it is ready.";
}

export function canRecordAuthorization(health, studentId, reference, busy) {
  return isRecognitionReady(health) && Boolean(studentId) && reference.trim().length >= 3 && !busy;
}

export function canEnrollStudent(health, studentId, authorized, captureReady, busy) {
  return isRecognitionReady(health) && Boolean(studentId) && authorized && captureReady && !busy;
}

export function canIdentifyStudent(health, classId, captureReady, busy) {
  return isRecognitionReady(health) && Boolean(classId) && captureReady && !busy;
}

export function enrollmentResultMessage(result) {
  if (result?.status === "enrolled") return "Enrollment template saved.";
  if (result?.status === "replaced") return "Enrollment template replaced.";
  throw new Error("The enrollment service returned an unexpected response. No success was confirmed.");
}
