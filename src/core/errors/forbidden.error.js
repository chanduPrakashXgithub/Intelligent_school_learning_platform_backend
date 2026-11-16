import { AppError } from "./app-error.js";

export class ForbiddenError extends AppError {
    constructor(
        message = "Access forbidden",
        code = "FORBIDDEN"
    ) {
        super(message, 403, code);
    }
}