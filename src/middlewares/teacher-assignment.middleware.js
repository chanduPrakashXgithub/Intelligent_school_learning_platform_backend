import { executeQuery } from "../core/database/query.js";
import { ForbiddenError } from "../core/errors/forbidden.error.js";
import { UnauthorizedError } from "../core/errors/unauthorized.error.js";
import { USER_ROLES } from "../config/constants.js";

const isPositiveInteger = (value) => /^[1-9]\d*$/.test(String(value ?? ""));

export const createTeacherSectionAssignmentMiddleware = (
    query = executeQuery,
    sectionParam = "sectionId"
) => {
    return async (req, res, next) => {
        if (!req.user || !req.context) {
            return next(new UnauthorizedError(
                "Authentication and school context are required",
                "AUTH_REQUIRED"
            ));
        }

        if (req.user.role !== USER_ROLES.TEACHER) {
            return next();
        }

        const sectionId = req.params[sectionParam];

        if (!isPositiveInteger(sectionId)) {
            return next(new ForbiddenError(
                "A valid section is required",
                "SECTION_ACCESS_DENIED"
            ));
        }

        try {
            const rows = await query(
                `SELECT id
                 FROM teacher_assignments
                 WHERE school_id = ?
                   AND teacher_id = ?
                   AND section_id = ?
                   AND is_active = 1
                   AND (start_date IS NULL OR start_date <= CURRENT_DATE)
                   AND (end_date IS NULL OR end_date >= CURRENT_DATE)
                 LIMIT 1`,
                [req.context.schoolId, req.user.teacherId, String(sectionId)]
            );

            if (rows.length === 0) {
                return next(new ForbiddenError(
                    "You are not assigned to this section",
                    "SECTION_ASSIGNMENT_REQUIRED"
                ));
            }

            return next();
        } catch (error) {
            return next(error);
        }
    };
};

export const requireTeacherSectionAssignment =
    createTeacherSectionAssignmentMiddleware();
