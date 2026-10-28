import { Router } from "express";
import { requireAuth, requireHeadOfDepartment } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { create, deactivate, getById, list, update } from "./student.controller.js";
import { studentCreateSchema, studentIdParamsSchema, studentListQuerySchema, studentUpdateSchema } from "./student.schema.js";

const router = Router();
router.use(requireAuth);
router.get("/", validateRequest({ query: studentListQuerySchema }), list);
router.get("/:id", validateRequest({ params: studentIdParamsSchema }), getById);
router.post("/", requireHeadOfDepartment, validateRequest({ body: studentCreateSchema }), create);
router.patch("/:id", requireHeadOfDepartment, validateRequest({ params: studentIdParamsSchema, body: studentUpdateSchema }), update);
router.delete("/:id", requireHeadOfDepartment, validateRequest({ params: studentIdParamsSchema }), deactivate);

export default router;
