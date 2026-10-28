import { api, getApiData } from "../lib/api.js";

export const dashboardQueryKey = ["dashboard", "summary"];
export const classesQueryKey = ["classes"];

export async function getDashboardSummary() {
  return getApiData(await api.get("/dashboard/summary"));
}

export async function getClasses() {
  return getApiData(await api.get("/classes"));
}

export async function getClassById(id) {
  return getApiData(await api.get(`/classes/${encodeURIComponent(id)}`));
}

export function toStudentView(student) {
  return {
    ...student,
    admissionNumber: student.studentCode,
    name: student.displayName || `${student.firstName} ${student.lastName}`.trim(),
  };
}

export async function getClassStudents({ classId, search, gender, sortKey, sortDirection, page, limit, signal }) {
  const sortBy = sortKey === "admissionNumber" ? "studentCode" : sortKey;
  const response = await api.get("/students", {
    signal,
    params: {
      classId,
      search: search || undefined,
      gender: gender === "All" ? undefined : gender,
      sortBy,
      sortOrder: sortDirection,
      page,
      limit,
    },
  });
  const payload = getApiData(response);
  return { students: payload.students.map(toStudentView), pagination: payload.pagination };
}
