import { Router } from "express";
import { ApiResponse } from "../../core/http/response.js";
import { executeQuery } from "../../core/database/query.js";
import { NotFoundError } from "../../core/errors/not-found.error.js";
import { authenticate } from "../../middlewares/authenticate.middleware.js";
import { authorizeRole } from "../../middlewares/authorize.middleware.js";
import { tenantContext } from "../../middlewares/tenant-context.middleware.js";
import { requireTeacherSectionAssignment } from "../../middlewares/teacher-assignment.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { USER_ROLES } from "../../config/constants.js";
import { sectionParamsSchema } from "./classes.validator.js";

const router = Router();

router.get(
    "/sections/:sectionId",
    authenticate,
    tenantContext,
    authorizeRole(USER_ROLES.ADMIN, USER_ROLES.TEACHER),
    validate(sectionParamsSchema),
    requireTeacherSectionAssignment,
    async (req, res, next) => {
        try {
            const rows = await executeQuery(
                `SELECT id, class_id AS classId, academic_year_id AS academicYearId, name
                 FROM sections
                 WHERE id = ? AND school_id = ?
                 LIMIT 1`,
                [String(req.params.sectionId), req.context.schoolId]
            );

            if (rows.length === 0) {
                throw new NotFoundError("Section not found");
            }

            return ApiResponse.success(res, rows[0]);
        } catch (error) {
            return next(error);
        }
    }
);

export default router;
