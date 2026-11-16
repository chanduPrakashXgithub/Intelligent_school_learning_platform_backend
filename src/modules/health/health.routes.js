
import { Router } from "express";

import { ApiResponse } from
    "../../core/http/response.js";

import { AppError } from
    "../../core/errors/app-error.js";

import { checkDatabaseConnection } from
    "../../core/database/pool.js";

import { validate } from
    "../../middlewares/validate.middleware.js";

import { healthQuerySchema } from
    "./health.validator.js";

const router = Router();

router.get(
    "/",
    validate(healthQuerySchema),
    async (req, res, next) => {

        try {

            await checkDatabaseConnection();

            const data = {
                service: "school-learning-platform",
                application: "healthy",
                database: "connected"
            };

            if (req.validated.query.detailed === "true") {
                data.version = "1.0.0";
                data.environment = process.env.NODE_ENV;
            }

            return ApiResponse.success(res, data);

        } catch (error) {

            console.error("Database health check failed:", error);

            return next(
                new AppError(
                    "Database service unavailable",
                    503,
                    "DATABASE_UNAVAILABLE"
                )
            );

        }

    }
);

export default router;
