import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
  timeout: 15000,
  withXSRFToken: true,
  xsrfCookieName: "gs_vm_csrf",
  xsrfHeaderName: "x-csrf-token",
  headers: { Accept: "application/json" },
});

export function getApiData(response) {
  return response.data.data;
}

export function getApiErrorMessage(error, fallback = "The request could not be completed. Please try again.") {
  return error?.response?.data?.error?.message || error?.message || fallback;
}
