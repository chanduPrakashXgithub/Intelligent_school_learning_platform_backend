
import { ValidationError } from "../core/errors/validation.error.js";

export const validate = (schema) => {
    return (req, res, next) => {

        const payload = {
            body: req.body ?? {},
            query: req.query ?? {},
            params: req.params ?? {}
        };

        const result = schema.safeParse(payload);

        if (!result.success) {

            const details = result.error.issues.map(issue => ({
                field: issue.path.join("."),
                message: issue.message
            }));

            return next(
                new ValidationError(
                    "Invalid request data",
                    details
                )
            );
        }

        // Store validated and parsed data separately.
        req.validated = result.data;

        next();
    };
};
