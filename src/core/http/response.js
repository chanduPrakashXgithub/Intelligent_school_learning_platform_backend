
export class ApiResponse {
    static success(
        res,
        data = null,
        meta = {},
        statusCode = 200
    ) {
        return res.status(statusCode).json({
            success: true,
            data,
            meta: {
                ...meta,
                requestId: res.locals.requestId
            },
            error: null
        });
    }
}
