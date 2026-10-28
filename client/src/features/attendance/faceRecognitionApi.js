import { api, getApiData } from "../../lib/api.js";

export async function getFaceRecognitionHealth() {
  return getApiData(await api.get("/face-recognition/health"));
}

export async function setStudentFaceAuthorization(studentId, authorizationReference) {
  return getApiData(await api.put(`/students/${encodeURIComponent(studentId)}/face-authorization`, { authorizationReference }));
}

export async function getStudentFaceEnrollment(studentId) {
  return getApiData(await api.get(`/students/${encodeURIComponent(studentId)}/face-enrollment`));
}

export async function enrollStudentFace(studentId, image, signal) {
  return getApiData(await api.post(`/students/${encodeURIComponent(studentId)}/face-enrollments`, { image }, { signal }));
}

export async function revokeStudentFaceEnrollment(studentId) {
  return getApiData(await api.delete(`/students/${encodeURIComponent(studentId)}/face-enrollment`));
}

export async function identifyStudentFace(classId, image, signal) {
  return getApiData(await api.post("/face-recognition/identify", { classId, image }, { signal }));
}
