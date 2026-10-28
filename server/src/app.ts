import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { databaseIsReady } from "./config/db.js";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { csrfProtection } from "./middleware/csrf.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import faceRecognitionRoutes from "./modules/face-recognition/face-recognition.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import classRoutes from "./modules/classes/class.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import studentRoutes from "./modules/students/student.routes.js";
import teacherRoutes from "./modules/teachers/teacher.routes.js";

const app = express();
export const getHealthPayload = () => databaseIsReady()
  ? { status: 200, body: { success: true, data: { service: "ok", database: "connected" }, message: "Service is healthy" } }
  : { status: 503, body: { success: false, error: { code: "DATABASE_UNAVAILABLE", message: "Database connection is unavailable" } } };
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.CLIENT_ORIGIN.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: "4mb" }));
app.use(cookieParser());
app.use(csrfProtection);

app.get("/api/v1/health", (_request, response) => {
  const health = getHealthPayload();
  response.status(health.status).json(health.body);
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/students", studentRoutes);
app.use("/api/v1/classes", classRoutes);
app.use("/api/v1/teachers", teacherRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1", faceRecognitionRoutes);
app.use("/api/v1", requireAuth);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
