import { api, getApiData } from "../../lib/api.js";

export const currentUserQueryKey = ["auth", "me"];

export async function fetchCurrentUser() {
  const response = await api.get("/auth/me");
  return getApiData(response).user;
}

export async function loginStaff(credentials) {
  const response = await api.post("/auth/login", credentials);
  return getApiData(response).user;
}

export async function logoutStaff() {
  return api.post("/auth/logout");
}
