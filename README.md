# School Learning Platform Backend

The backend is an Express 5 API using MySQL 8.4, Zod, JWT, bcrypt, and
server-authoritative school tenancy.

## Setup

1. Copy `.env.example` to `.env` and set the MySQL and JWT values.
2. Install dependencies with `npm install`.
3. Create the database configured by `DB_NAME`.
4. Run `npm run migrate`.
5. Run `npm run seed` for the pilot school data.
6. Start the API with `npm start` or `npm run dev`.

The seed creates `PILOT-001`, an administrator
(`admin@pilotschool.example` / `Admin@12345`) and a teacher
(`teacher@pilotschool.example` / `Teacher@12345`). Change these credentials
before using a shared environment.

## API

- `GET /health` checks the HTTP process.
- `GET /api/v1/health` checks the HTTP process and database.
- `POST /api/v1/auth/login` returns a JWT.
- `GET /api/v1/auth/me` validates the JWT and resolves school context.
- `GET /api/v1/classes/sections/:sectionId` demonstrates role and
  teacher-section assignment authorization.

Every successful and failed response includes `meta.requestId`, and every
tenant-scoped query requires `school_id` from the authenticated token.

## Phase completion

| Phase | Status | Evidence |
| --- | --- | --- |
| Phase 1 - Core Runtime & Tooling | Complete | Express bootstrap, environment Zod schema, `/api/v1`, response/error helpers, request IDs, and request validation |
| Phase 2 - Database & Multi-Tenancy | Complete | MySQL pool, transaction helper, tenant-scoped repositories, migration lock/history, idempotent seed, and composite tenant foreign keys |
| Phase 3 - Security, Authentication & Verification | Complete | JWT claim/database checks, bcrypt passwords, RBAC, teacher assignment middleware, security/validation tests, and this documentation |

## Verification

- `npm test` runs the dependency-free security and validation tests.
- `npm run db:check` verifies MySQL connectivity and rollback behavior.
- `npm run test:tenant` verifies cross-school repository isolation after at
  least two schools exist.
