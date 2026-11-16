
import { ForbiddenError } from "../core/errors/forbidden.error.js";
import { UnauthorizedError } from "../core/errors/unauthorized.error.js";

export function authorizeRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(
                new UnauthorizedError(
                    "Authentication is required",
                    "AUTH_REQUIRED"
                )
            );
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                new ForbiddenError(
                    "You do not have permission to access this resource",
                    "ROLE_ACCESS_DENIED"
                )
            );
        }

        return next();
    };
}
