import { api, getApiData } from "../../lib/api.js";
import { applyAuthResponse, clearCsrfToken } from "../../lib/csrfToken.js";

export const currentUserQueryKey = ["auth", "me"];

export async function fetchCurrentUser() {
  const response = await api.get("/auth/me");
  const data = getApiData(response);
  return applyAuthResponse(data);
}

export async function loginStaff(credentials) {
  clearCsrfToken();
  try {
    const response = await api.post("/auth/login", credentials);
    const data = getApiData(response);
    return applyAuthResponse(data);
  } catch (error) {
    clearCsrfToken();
    throw error;
  }
}

export async function logoutStaff() {
  try {
    return await api.post("/auth/logout");
  } finally {
    clearCsrfToken();
  }
}

export function clearStaffCsrfToken() {
  clearCsrfToken();
}
