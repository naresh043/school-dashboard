import axios from "axios";
import { applyCsrfHeader, clearCsrfToken } from "./csrfToken.js";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
  timeout: 15000,
  withXSRFToken: false,
  xsrfCookieName: "gs_vm_csrf",
  xsrfHeaderName: "x-csrf-token",
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  return applyCsrfHeader(config);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && error?.config?.url !== "/auth/login") {
      clearCsrfToken();
    }
    throw error;
  },
);

export function getApiData(response) {
  return response.data.data;
}

export function getApiErrorMessage(error, fallback = "The request could not be completed. Please try again.") {
  return error?.response?.data?.error?.message || error?.message || fallback;
}
