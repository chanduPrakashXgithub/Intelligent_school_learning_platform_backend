# Module 0 — Issues, Edge Cases and Recommendations

During the comprehensive audit of Module 0, three defects were identified and remediated. This document details each issue, root cause analysis, applied correction, and recommendations for future module development.

---

## 1. Resolved Issues

### Issue 1: Validation Middleware Payload Failure on Body-less GET Requests
- **Severity**: **Critical**
- **Affected File**: [src/middlewares/validate.middleware.js](file:///E:/School_Learning_platform/backend/src/middlewares/validate.middleware.js)
- **What Was Wrong**: In Express, HTTP GET and DELETE requests typically do not carry a request body, meaning `req.body` is `undefined`. The validation middleware passed `payload = { body: req.body, query: req.query, params: req.params }`. Any Zod schema that validated the body (e.g. `body: z.object({}).strict()` in `classes.validator.js`) failed immediately with:
  ```json
  {
    "field": "body",
    "message": "Invalid input: expected object, received undefined"
  }
  ```
- **Why It Was a Problem**: It caused all GET requests using strict schemas (such as `GET /api/v1/classes/sections/:sectionId`) to return `400 VALIDATION_ERROR` even when the request was completely valid.
- **Applied Correction**: Normalized the payload in `validate.middleware.js`:
  ```javascript
  const payload = {
      body: req.body ?? {},
      query: req.query ?? {},
      params: req.params ?? {}
  };
  ```
- **Verification**: Verified via `test/api.test.js` where `GET /api/v1/classes/sections/1` now executes smoothly through the middleware chain and returns 200 OK.

---

### Issue 2: Foreign Key Constraint Violation in Pilot Seed Script
- **Severity**: **High**
- **Affected File**: [src/database/seeds/001_pilot_school_seed.sql](file:///E:/School_Learning_platform/backend/src/database/seeds/001_pilot_school_seed.sql)
- **What Was Wrong**: The statement allocating sections to classes (`INSERT INTO sections ...`) was located at the end of the seed script, *after* the query `SET @section_id = (SELECT id FROM sections WHERE school_id = @school_id ORDER BY id LIMIT 1);` and the subsequent `INSERT INTO teacher_assignments`.
- **Why It Was a Problem**: On a newly initialized database where `sections` was empty, `@section_id` resolved to `NULL`. Attempting to insert `NULL` into `teacher_assignments.section_id` violated the `NOT NULL` column constraint, causing the entire seed transaction to fail on fresh environments.
- **Applied Correction**: Swapped statement ordering so `sections` are populated before `@section_id` is queried and `teacher_assignments` are inserted.
- **Verification**: Executed `npm run seed`; verified that pilot school sections and teacher assignment records are created cleanly.

---

### Issue 3: Unhandled Malformed JSON Returning 500 Internal Server Error
- **Severity**: **Medium**
- **Affected File**: [src/middlewares/error-handler.middleware.js](file:///E:/School_Learning_platform/backend/src/middlewares/error-handler.middleware.js)
- **What Was Wrong**: When a client submitted a request with broken or malformed JSON (e.g. `{"invalid": json`), Express's `express.json()` threw a `SyntaxError`. Because `SyntaxError` was not an instance of `AppError`, the centralized error handler treated it as an unhandled server error, logged a full stack trace, and returned HTTP 500 (`INTERNAL_SERVER_ERROR`).
- **Why It Was a Problem**: Malformed input is a client error (HTTP 400), not an internal server failure. Returning 500 polluted server error logs with false alarms.
- **Applied Correction**: Added an explicit check in `errorHandler` for body-parser syntax errors:
  ```javascript
  if (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400) && "body" in err) {
      return res.status(400).json({
          success: false,
          data: null,
          meta: { requestId: res.locals.requestId },
          error: {
              code: "INVALID_JSON",
              message: "Malformed JSON in request body",
              details: null
          }
      });
  }
  ```
- **Verification**: Verified via `test/api.test.js` where submitting broken JSON to `POST /api/v1/auth/login` returns HTTP 400 with code `INVALID_JSON`.

---

## 2. Low-Priority Recommendations for Future Phases

1. **Structured Logging (Pino/Winston)**:
   - *Current State*: Uses `console.log`, `console.warn`, and `console.error` with request ID metadata.
   - *Recommendation*: Introduce Pino in Phase 10 for high-performance structured JSON streaming suitable for Datadog, ELK, or CloudWatch.

2. **Rate Limiting**:
   - *Current State*: Not present in Module 0.
   - *Recommendation*: Attach `express-rate-limit` to `/api/v1/auth/login` in Phase 10 to guard against automated credential stuffing.

3. **Multi-School Fixture Helper in Tenant Test Script**:
   - *Current State*: `scripts/test-tenant.js` requires at least two schools to exist in the database.
   - *Recommendation*: If only one school exists, have the test script automatically insert and clean up a temporary second school for testing convenience.
