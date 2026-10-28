import assert from "node:assert/strict";
import { test } from "node:test";
import { canEnrollStudent, canIdentifyStudent, canRecordAuthorization, enrollmentResultMessage, getRecognitionUnavailableMessage, isRecognitionReady } from "./faceRecognitionState.js";

const unavailable = { status: "unavailable", modelConfigured: false, reason: "model_not_ready" };
const ready = { status: "ready", modelConfigured: true, reason: null };

test("unavailable provider disables authorization, enrollment, and recognition actions", () => {
  assert.equal(isRecognitionReady(unavailable), false);
  assert.equal(canRecordAuthorization(unavailable, "student-1", "approved-reference", false), false);
  assert.equal(canEnrollStudent(unavailable, "student-1", true, true, false), false);
  assert.equal(canIdentifyStudent(unavailable, "class-1", true, false), false);
  assert.match(getRecognitionUnavailableMessage(unavailable), /development recognition provider.*no licensed identity model/i);
});

test("local face detection readiness is independent of provider readiness", () => {
  const locallyDetected = { status: "face-detected", faceCount: 1 };
  assert.equal(locallyDetected.status, "face-detected");
  assert.equal(canEnrollStudent(unavailable, "student-1", true, locallyDetected.status === "face-detected", false), false);
  assert.equal(canEnrollStudent(ready, "student-1", true, locallyDetected.status === "face-detected", false), true);
});

test("enrollment success requires the documented response body status", () => {
  assert.equal(enrollmentResultMessage({ status: "enrolled" }), "Enrollment template saved.");
  assert.equal(enrollmentResultMessage({ status: "replaced" }), "Enrollment template replaced.");
  assert.throws(() => enrollmentResultMessage({ authorizationStatus: "authorized", enrollment: null }), /unexpected response/i);
});
