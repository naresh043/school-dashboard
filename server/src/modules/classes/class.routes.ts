import { Router } from "express";
import { requireAuth, requireHeadOfDepartment } from "../../middleware/auth.middleware.js";
import { validateRequest } from "../../middleware/validate.middleware.js";
import { create, getById, list, update } from "./class.controller.js";
import { classCreateSchema, classIdParamsSchema, classListQuerySchema, classUpdateSchema } from "./class.schema.js";

const router = Router();
router.use(requireAuth);
router.get("/", validateRequest({ query: classListQuerySchema }), list);
router.get("/:id", validateRequest({ params: classIdParamsSchema }), getById);
router.post("/", requireHeadOfDepartment, validateRequest({ body: classCreateSchema }), create);
router.patch("/:id", requireHeadOfDepartment, validateRequest({ params: classIdParamsSchema, body: classUpdateSchema }), update);

export default router;
