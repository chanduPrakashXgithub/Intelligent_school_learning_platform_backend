
import { AppError } from "../core/errors/app-error.js";

export const errorHandler = (err, req, res, next) => {

    if (res.headersSent) {
        return next(err);
    }

    // Handle malformed JSON body errors from body-parser
    if (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400) && "body" in err) {
        const requestId = res.locals.requestId;
        console.warn({
            requestId,
            code: "INVALID_JSON",
            message: "Malformed JSON in request body"
        });
        return res.status(400).json({
            success: false,
            data: null,
            meta: {
                requestId
            },
            error: {
                code: "INVALID_JSON",
                message: "Malformed JSON in request body",
                details: null
            }
        });
    }

    const isOperational = err instanceof AppError;

    const statusCode = isOperational
        ? err.statusCode
        : 500;

    const code = isOperational
        ? err.code
        : "INTERNAL_SERVER_ERROR";

    const message = isOperational
        ? err.message
        : "Internal server error";

    const details = isOperational
        ? err.details
        : null;

    const requestId = res.locals.requestId;

    // Log detailed information on the server.
    if (statusCode >= 500) {
        console.error({
            requestId,
            message: err.message,
            stack: err.stack
        });
    } else {
        console.warn({
            requestId,
            code,
            message
        });
    }

    return res.status(statusCode).json({
        success: false,
        data: null,
        meta: {
            requestId
        },
        error: {
            code,
            message,
            details
        }
    });
};
