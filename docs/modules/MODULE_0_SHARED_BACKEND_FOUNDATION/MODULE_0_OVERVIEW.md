# Module 0: Shared Backend Foundation — Architectural Overview

## 1. Module Mission and Responsibilities

Module 0 provides the non-negotiable architectural, security, database, and operational baseline for the entire School Learning Platform backend. It encapsulates:

1. **HTTP Runtime & Security**: Express 5.3 application bootstrap, security headers via Helmet, CORS origin whitelisting, and correlation request tracking via UUIDv4.
2. **Database Connectivity**: Production-grade connection pooling on MySQL 8.4 Server (`mysql2/promise`), query execution helpers, and transactional unit-of-work boundaries (`withTransaction`).
3. **Environment Security**: Immutable, fail-fast configuration loading with Zod schema validation.
4. **API Envelope & Error Protocol**: Centralized error interceptor mapping operational errors (`AppError`) to deterministic JSON envelopes, preventing stack trace exposure.
5. **Request Validation**: Pre-controller schema parsing of `body`, `query`, and `params` via Zod.
6. **Authentication Gateway**: Cryptographic JWT verification with database active status and role desynchronization checks.
7. **Multi-Tenancy Isolation**: Strict server-authoritative school scoping (`req.context.schoolId`) and rejection of client-supplied tenant identifiers (`CLIENT_TENANT_OVERRIDE`).
8. **Authorization Engine**: Role-Based Access Control (RBAC) and section-level Teacher Assignment Access Control (ABAC).
9. **Database Migrations & Seed**: Checksum-verified, concurrency-locked SQL migration runner and deterministic seed scripts for pilot schools.
10. **Automated Verification**: End-to-end integration and unit test suite verifying security, validation, database, and HTTP contracts.

---

## 2. Directory Architecture

```
backend/src/
├── app.js                          # Master Express app assembly
├── server.js                       # Server entry point & graceful shutdown
├── config/
│   ├── constants.js                # System-wide enums & HTTP status codes
│   ├── database.js                 # Database configuration object
│   └── env.js                      # Validated environment variables (Zod)
├── core/
│   ├── database/
│   │   ├── pool.js                 # MySQL2 connection pool singleton
│   │   ├── query.js                # executeQuery & executeMutation helpers
│   │   ├── transaction.js          # withTransaction rollback wrapper
│   │   └── base.repository.js      # Tenant-scoped base CRUD repository
│   ├── errors/
│   │   ├── app-error.js            # Base application error
│   │   ├── not-found.error.js      # 404 Not Found
│   │   ├── validation.error.js     # 400 Bad Request
│   │   ├── unauthorized.error.js   # 401 Unauthorized
│   │   ├── forbidden.error.js      # 403 Forbidden
│   │   └── conflict.error.js       # 409 Conflict
│   └── http/
│       └── response.js             # ApiResponse standardized envelope
├── middlewares/
│   ├── request-id.middleware.js    # Injects X-Request-ID (UUIDv4)
│   ├── authenticate.middleware.js  # JWT validation & account status lookup
│   ├── tenant-context.middleware.js# Derives and locks req.context.schoolId
│   ├── authorize.middleware.js     # RBAC role verification
│   ├── teacher-assignment.middleware.js # ABAC section assignment lookup
│   ├── validate.middleware.js      # Zod schema validation
│   └── error-handler.middleware.js # Centralized Express error handler
├── database/
│   ├── migrator.js                 # Distributed-locked migration engine
│   ├── migrations/                 # Ordered SQL DDL scripts
│   └── seeds/                      # Deterministic pilot data seeders
└── routes/
    └── v1/
        └── index.js                # Master v1 API Router
```

---

## 3. End-to-End Request Lifecycle

```
Client HTTP Request (e.g. GET /api/v1/classes/sections/1)
   │
   ▼
[requestIdMiddleware] ── Attaches UUIDv4 to res.locals.requestId & header X-Request-ID
   │
   ▼
[helmet & cors] ──────── Applies security headers & validates origin
   │
   ▼
[authenticate] ───────── Decodes JWT; verifies HS256 signature; confirms user & school are active in DB; sets req.user
   │
   ▼
[tenantContext] ──────── Enforces req.context.schoolId = req.user.schoolId; rejects client schoolId overrides
   │
   ▼
[authorizeRole] ──────── Verifies user.role matches SCHOOL_ADMIN or TEACHER
   │
   ▼
[validate] ───────────── Validates { body, query, params } against sectionParamsSchema
   │
   ▼
[requireTeacherSectionAssignment] ── Verifies teacher is actively assigned to Section 1 in DB
   │
   ▼
[Controller Handler] ─── Executes query with WHERE id = ? AND school_id = ?
   │
   ▼
[ApiResponse.success] ── Formats { success: true, data: ..., meta: { requestId }, error: null }
```

---

## 4. Module Verification Summary

- **Total Unit & Integration Tests**: 18 passing
- **Database Rollback Integrity**: Verified via `scripts/check-db.js`
- **Multi-Tenant Repository Isolation**: Verified via `scripts/test-tenant.js`
- **Migration & Idempotency**: Verified via `scripts/migrate.js`
- **Seed Execution**: Verified via `scripts/seed.js`
- **Status**: **PASS — FULLY VERIFIED AND OPERATIONAL**
