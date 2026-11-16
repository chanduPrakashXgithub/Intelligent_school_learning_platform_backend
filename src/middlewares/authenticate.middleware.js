import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { USER_ROLES } from "../config/constants.js";
import { executeQuery } from "../core/database/query.js";

import { UnauthorizedError } from
    "../core/errors/unauthorized.error.js";

const VALID_ROLES = new Set(Object.values(USER_ROLES));

function isValidId(value) {
    return /^[1-9]\d*$/.test(String(value ?? ""));
}

function invalidToken() {
    return new UnauthorizedError(
        "Invalid or malformed authentication token",
        "AUTH_TOKEN_INVALID"
    );
}

export async function authenticate(req, res, next) {

    const authorization = req.headers.authorization;

    if (!authorization) {
        return next(
            new UnauthorizedError(
                "Authorization token is required",
                "AUTH_TOKEN_MISSING"
            )
        );
    }

    const match = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
        return next(
            new UnauthorizedError(
                "Authorization header must use Bearer token format",
                "AUTH_TOKEN_INVALID"
            )
        );
    }

    // 1. Verify JWT signature and standard claims.
    let payload;

    try {
        payload = jwt.verify(
            match[1],
            env.JWT_SECRET,
            {
                algorithms: ["HS256"],
                issuer: "school-learning-platform",
                audience: "school-learning-platform-api"
            }
        );

    } catch (error) {

        if (error.name === "TokenExpiredError") {
            return next(
                new UnauthorizedError(
                    "Authentication token has expired",
                    "AUTH_TOKEN_EXPIRED"
                )
            );
        }

        return next(invalidToken());
    }

    // 2. Validate JWT claims.
    if (
        !payload ||
        typeof payload !== "object" ||
        !isValidId(payload.userId) ||
        !isValidId(payload.schoolId) ||
        !VALID_ROLES.has(payload.role)
    ) {
        return next(invalidToken());
    }

    if (
        payload.role === USER_ROLES.TEACHER &&
        !isValidId(payload.teacherId)
    ) {
        return next(invalidToken());
    }

    // In this schema, teacherId is the teacher's users.id.
    if (
        payload.role === USER_ROLES.TEACHER &&
        String(payload.teacherId) !== String(payload.userId)
    ) {
        return next(invalidToken());
    }

    // 3. Check current account and school status in MySQL.
    // This also detects users whose role or school membership changed.
    const sql = `
        SELECT
            u.id,
            u.school_id,
            u.role,
            u.is_active AS user_is_active,
            s.is_active AS school_is_active
        FROM users u
        INNER JOIN schools s
            ON s.id = u.school_id
        WHERE
            u.id = ?
            AND u.school_id = ?
        LIMIT 1
    `;

    const rows = await executeQuery(sql, [
        String(payload.userId),
        String(payload.schoolId)
    ]);

    const user = rows[0];

    if (
        !user ||
        Number(user.user_is_active) !== 1 ||
        Number(user.school_is_active) !== 1
    ) {
        return next(
            new UnauthorizedError(
                "Your account or school access is no longer active",
                "AUTH_ACCOUNT_INACTIVE"
            )
        );
    }

    // A role change in the database invalidates the old token.
    if (user.role !== payload.role) {
        return next(invalidToken());
    }

    // 4. Attach trusted identity to the request.
    req.user = Object.freeze({
        userId: String(user.id),
        schoolId: String(user.school_id),
        role: user.role,
        teacherId: user.role === USER_ROLES.TEACHER
            ? String(user.id)
            : null
    });

    return next();
}