import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { queryClient } from "./lib/queryClient.js";
import { currentUserQueryKey } from "./features/auth/authApi.js";
import { useCurrentUser } from "./features/auth/useCurrentUser.js";
import DashboardPage from "./features/dashboard/DashboardPage.jsx";
import NotFoundPage from "./features/dashboard/NotFoundPage.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import ClassDetailsPage from "./features/students/ClassDetailsPage.jsx";
import FaceAttendancePage from "./features/attendance/FaceAttendancePage.jsx";
import { getApiErrorMessage } from "./lib/api.js";
import "./App.css";

function Protected({ children }) {
  const location = useLocation();
  const { data: user, isLoading, isError, error } = useCurrentUser();
  if (isLoading) return <main className="auth-check-state" role="status">Checking your staff session…</main>;
  if (isError && error?.response?.status !== 401) {
    return (
      <main className="auth-check-state" role="alert">
        <h1>Could not verify your session</h1>
        <p>{getApiErrorMessage(error, "The school server could not be reached.")}</p>
        <button className="primary-button" onClick={() => queryClient.invalidateQueries({ queryKey: currentUserQueryKey })}>Try again</button>
        <Link to="/login">Go to staff sign in</Link>
      </main>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/classes" element={<Protected><DashboardPage directoryOnly /></Protected>} />
          <Route path="/classes/:classId" element={<Protected><ClassDetailsPage /></Protected>} />
          <Route path="/attendance" element={<Protected><FaceAttendancePage /></Protected>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Protected><NotFoundPage /></Protected>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
