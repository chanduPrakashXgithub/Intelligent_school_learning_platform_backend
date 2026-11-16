
import { UnauthorizedError } from "../core/errors/unauthorized.error.js";
import { ForbiddenError } from "../core/errors/forbidden.error.js";

function normalizeKey(key) {
    return key.toLowerCase().replace(/[_-]/g, "");
}

function containsSchoolId(value, visited = new Set()) {
    if (!value || typeof value !== "object") {
        return false;
    }

    if (visited.has(value)) {
        return false;
    }

    visited.add(value);

    for (const [key, nestedValue] of Object.entries(value)) {
        if (normalizeKey(key) === "schoolid") {
            return true;
        }

        if (containsSchoolId(nestedValue, visited)) {
            return true;
        }
    }

    return false;
}

function hasClientTenantOverride(req) {
    // Check request headers.
    for (const headerName of Object.keys(req.headers)) {
        if (normalizeKey(headerName) === "schoolid") {
            return true;
        }
    }

    // Check query parameters, body and route parameters.
    return (
        containsSchoolId(req.query) ||
        containsSchoolId(req.body) ||
        containsSchoolId(req.params)
    );
}

export function tenantContext(req, res, next) {
    // Authentication must run before tenant context.
    if (!req.user) {
        return next(
            new UnauthorizedError(
                "Authentication is required before resolving school context",
                "AUTH_REQUIRED"
            )
        );
    }

    // Never accept a tenant identifier from the client.
    if (hasClientTenantOverride(req)) {
        return next(
            new ForbiddenError(
                "School ID must not be supplied by the client",
                "CLIENT_TENANT_OVERRIDE"
            )
        );
    }

    const schoolId = String(req.user.schoolId ?? "");

    if (!/^[1-9]\d*$/.test(schoolId)) {
        return next(
            new UnauthorizedError(
                "Authenticated user has an invalid school identity",
                "AUTH_TOKEN_INVALID"
            )
        );
    }

    // Server-authoritative tenant context.
    req.context = Object.freeze({
        schoolId
    });

    return next();
}
