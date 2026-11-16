
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";
import { API_PREFIX } from "./config/constants.js";

import v1Router from "./routes/v1/index.js";

import { requestIdMiddleware } from
    "./middlewares/request-id.middleware.js";

import { errorHandler } from
    "./middlewares/error-handler.middleware.js";

import { NotFoundError } from
    "./core/errors/not-found.error.js";

const app = express();

// 1. Request tracing
app.use(requestIdMiddleware);

// 2. Security headers
app.use(helmet());

// 3. CORS configuration
const corsOptions = {
    origin(origin, callback) {

        // Allow requests without an Origin header,
        // such as server-to-server requests and Postman.
        if (!origin) {
            return callback(null, true);
        }

        if (env.CORS_ORIGINS.includes(origin)) {
            return callback(null, true);
        }

        return callback(
            new Error("Origin not allowed by CORS")
        );
    },

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Request-ID"
    ],

    credentials: true
};

app.use(cors(corsOptions));

// 4. Request body parsing
app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({
    extended: true,
    limit: "1mb"
}));

// 5. Application health check
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            service: "school-learning-platform",
            status: "healthy"
        },
        meta: {
            requestId: res.locals.requestId
        },
        error: null
    });
});

// 6. Versioned API routes
app.use(API_PREFIX, v1Router);

// 7. Handle unknown routes
app.use((req, res, next) => {
    next(
        new NotFoundError(
            `Route ${req.method} ${req.originalUrl} not found`
        )
    );
});

// 8. Centralized error handling
app.use(errorHandler);

export default app;
