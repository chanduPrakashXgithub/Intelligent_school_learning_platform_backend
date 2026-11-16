import { Router } from "express";

import healthRoutes from
    "../../modules/health/health.routes.js";

import authRoutes from
    "../../modules/auth/auth.routes.js";

import classesRoutes from
    "../../modules/classes/classes.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/classes", classesRoutes);

export default router;