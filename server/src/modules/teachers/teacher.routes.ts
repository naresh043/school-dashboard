import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { getById, list } from "./teacher.controller.js";
import { teacherIdParamsSchema } from "./teacher.schema.js";

const router = Router();
router.use(requireAuth);
router.get("/", list);
router.get("/:id", validateRequest({ params: teacherIdParamsSchema }), getById);
export default router;
