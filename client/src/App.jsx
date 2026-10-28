import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getCurrentUser } from "./services/schoolService.js";
import DashboardPage from "./features/dashboard/DashboardPage.jsx";
import NotFoundPage from "./features/dashboard/NotFoundPage.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import ClassDetailsPage from "./features/students/ClassDetailsPage.jsx";
import FaceAttendancePage from "./features/attendance/FaceAttendancePage.jsx";
import "./App.css";
function Protected({ children }) { const location = useLocation(); return getCurrentUser() ? children : <Navigate to="/login" replace state={{ from: location }} />; }
export default function App() { return <BrowserRouter><Routes><Route path="/login" element={<LoginPage />} /><Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} /><Route path="/classes" element={<Protected><DashboardPage directoryOnly /></Protected>} /><Route path="/classes/:classId" element={<Protected><ClassDetailsPage /></Protected>} /><Route path="/attendance" element={<Protected><FaceAttendancePage /></Protected>} /><Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="*" element={<Protected><NotFoundPage /></Protected>} /></Routes></BrowserRouter>; }
