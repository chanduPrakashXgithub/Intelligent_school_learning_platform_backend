# Backend Architectural Decision Records (ADR)

This document records the foundational architectural, security, database, and engineering decisions made for the School Learning Platform backend.

---

## ADR-001: Architecture Pattern — Modular Monolith over Microservices

### Context
The platform serves an educational ecosystem with diverse user roles (Teachers, Students, Administrators) across multiple functional modules (Studio, Classroom, Assessments, Analytics). Developing distributed microservices at the start would introduce significant network latency, distributed transaction overhead, service discovery complexity, and infrastructure management friction.

### Decision
Adopt a **Modular Monolith** architecture:
- Single deployable Node.js codebase.
- Strictly encapsulated domain modules inside `src/modules/`.
- Cross-module communication occurs via in-process service interfaces, never by direct cross-table SQL mutations.

### Consequences
- **Positive**: Low operational overhead, simple single-command deployment, zero distributed network latency, straightforward ACID transaction management via MySQL.
- **Negative**: Requires strict developer discipline to prevent coupling between module internals.

---

## ADR-002: Multi-Tenancy Strategy — Shared Database with Discriminator and Composite Foreign Keys

### Context
The platform is designed to scale across multiple independent schools. Data isolation between schools is legally and operationally mandatory.

### Decision
Adopt a **Shared Database, Shared Schema with Discriminator Column (`school_id`)** reinforced by **Composite Foreign Keys**:
1. Every school-scoped table must include `school_id BIGINT UNSIGNED NOT NULL`.
2. Master tables define composite unique keys: `UNIQUE (school_id, id)`.
3. Child tables enforce composite foreign keys referencing the composite key of the parent:
   ```sql
   CONSTRAINT fk_sections_class
       FOREIGN KEY (school_id, class_id)
       REFERENCES classes(school_id, id)
   ```
4. Application middleware derives `req.context.schoolId` strictly from verified JWT tokens and rejects client-supplied tenant identifiers (`CLIENT_TENANT_OVERRIDE`).
5. Repositories enforce `WHERE school_id = ?` on every query.

### Consequences
- **Positive**: High database resource efficiency, simplified cross-tenant backup and migration management, hardware-level cross-school reference prevention.
- **Negative**: Queries must consistently include `school_id` in joins and filters.

---

## ADR-003: Stateless JWT Authentication with Database Active Verification

### Context
The system requires secure authentication that can scale horizontally without requiring server session state, while still being able to immediately invalidate compromised accounts or deactivated schools.

### Decision
Use **Stateless JWT Access Tokens** paired with an **Active User & School Database Check** inside the `authenticate` middleware:
- Token signed using HMAC-SHA256 (`HS256`) with a 15-minute expiration time.
- Claims include `userId`, `schoolId`, `role`, and `teacherId`.
- The `authenticate` middleware verifies the cryptographic signature and then executes a lightweight indexed lookup against `users` and `schools` to ensure both the user account and the institution remain active (`is_active = 1`).
- Token claims are re-validated against current database role to prevent privilege escalation desync.

### Consequences
- **Positive**: Immediate revokability upon deactivation of user or school without needing a Redis cluster in Phase 0; tamper-proof client claims.
- **Negative**: Adds a single indexed SQL lookup to authenticated requests. Mitigated by composite index `(school_id, id)` and connection pooling.

---

## ADR-004: Standardized API Response and Error Envelope

### Context
Clients (React frontend, mobile applications, integration scripts) require predictable response formats to handle data and errors uniformly without inspecting arbitrary string error messages.

### Decision
All `/api/v1` endpoints must serialize output through the standard envelope:
- **Success Format**:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": {
      "requestId": "uuid-v4"
    },
    "error": null
  }
  ```
- **Error Format**:
  ```json
  {
    "success": false,
    "data": null,
    "meta": {
      "requestId": "uuid-v4"
    },
    "error": {
      "code": "ERROR_CODE_STRING",
      "message": "Human readable explanation",
      "details": null
    }
  }
  ```
- All responses include an injected `X-Request-ID` header and `meta.requestId`.

### Consequences
- **Positive**: Deterministic client consumption; rapid correlation of production issues via `requestId`.
- **Negative**: Controllers and handlers must consistently return via `ApiResponse` or throw `AppError` subclasses.

---

## ADR-005: Deterministic Lightweight SQL Migrations with Distributed Lock

### Context
Third-party ORM migration tools (e.g. TypeORM, Prisma) often abstract away pure SQL DDL, create migration locking issues on MySQL, or generate opaque migration tables. We require absolute transparency and version control over raw DDL.

### Decision
Implement a native, transparent SQL migration runner (`src/database/migrator.js`):
- Uses MySQL `GET_LOCK('school_learning_platform_migrations', 10)` to prevent race conditions during multi-instance deployment.
- Tracks applied scripts in `schema_migrations` table.
- Computes SHA-256 checksums of SQL files to detect and reject modified historical migrations.
- Executes statements sequentially and atomically records version upon completion.

### Consequences
- **Positive**: Complete control over raw MySQL DDL; zero third-party ORM lock-in; highly auditable schema history.
- **Negative**: Requires writing standard SQL DDL files manually.
