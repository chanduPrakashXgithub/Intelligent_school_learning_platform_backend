import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";

import app from "../src/app.js";
import { closeDatabasePool } from "../src/core/database/pool.js";

test("API End-to-End Test Suite", async (t) => {
    let server;
    let baseUrl;
    let teacherToken;
    let adminToken;

    await t.test("server boots and listens", async () => {
        await new Promise((resolve) => {
            server = http.createServer(app);
            server.listen(0, () => {
                const port = server.address().port;
                baseUrl = `http://localhost:${port}`;
                resolve();
            });
        });
        assert.ok(baseUrl);
    });

    await t.test("GET /health returns 200 with request ID", async () => {
        const res = await fetch(`${baseUrl}/health`);
        const json = await res.json();

        assert.equal(res.status, 200);
        assert.equal(json.success, true);
        assert.equal(json.data.status, "healthy");
        assert.ok(json.meta?.requestId);
    });

    await t.test("GET /api/v1/health returns database connectivity", async () => {
        const res = await fetch(`${baseUrl}/api/v1/health`);
        const json = await res.json();

        assert.equal(res.status, 200);
        assert.equal(json.success, true);
        assert.equal(json.data.database, "connected");
        assert.ok(json.meta?.requestId);
    });

    await t.test("POST /api/v1/auth/login validates credentials", async () => {
        // Missing fields
        const invalidRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "invalid" })
        });
        const invalidJson = await invalidRes.json();
        assert.equal(invalidRes.status, 400);
        assert.equal(invalidJson.error?.code, "VALIDATION_ERROR");

        // Valid teacher login
        const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                schoolCode: "PILOT-001",
                email: "teacher@pilotschool.example",
                password: "Teacher@12345"
            })
        });
        const json = await res.json();
        assert.equal(res.status, 200);
        assert.equal(json.success, true);
        assert.equal(json.data.user.role, "TEACHER");
        assert.ok(json.data.accessToken);
        teacherToken = json.data.accessToken;

        // Valid admin login
        const resAdmin = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                schoolCode: "PILOT-001",
                email: "admin@pilotschool.example",
                password: "Admin@12345"
            })
        });
        const jsonAdmin = await resAdmin.json();
        assert.equal(resAdmin.status, 200);
        assert.equal(jsonAdmin.data.user.role, "SCHOOL_ADMIN");
        adminToken = jsonAdmin.data.accessToken;
    });

    await t.test("GET /api/v1/auth/me resolves identity and tenant", async () => {
        // Without token -> 401
        const noAuth = await fetch(`${baseUrl}/api/v1/auth/me`);
        const noAuthJson = await noAuth.json();
        assert.equal(noAuth.status, 401);
        assert.equal(noAuthJson.error?.code, "AUTH_TOKEN_MISSING");

        // With valid teacher token -> 200
        const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        const json = await res.json();
        assert.equal(res.status, 200);
        assert.equal(json.success, true);
        assert.equal(json.data.user.role, "TEACHER");
        assert.equal(json.data.tenant.schoolId, "1");
    });

    await t.test("GET /api/v1/classes/sections/:sectionId enforces teacher assignment", async () => {
        // Assigned section 1 -> 200
        const resAssigned = await fetch(`${baseUrl}/api/v1/classes/sections/1`, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        const jsonAssigned = await resAssigned.json();
        assert.equal(resAssigned.status, 200);
        assert.equal(jsonAssigned.success, true);
        assert.equal(jsonAssigned.data.name, "A");

        // Unassigned section 2 -> 403
        const resUnassigned = await fetch(`${baseUrl}/api/v1/classes/sections/2`, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        const jsonUnassigned = await resUnassigned.json();
        assert.equal(resUnassigned.status, 403);
        assert.equal(jsonUnassigned.error?.code, "SECTION_ASSIGNMENT_REQUIRED");

        // Admin bypasses assignment -> 200
        const resAdmin = await fetch(`${baseUrl}/api/v1/classes/sections/2`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const jsonAdmin = await resAdmin.json();
        assert.equal(resAdmin.status, 200);
        assert.equal(jsonAdmin.success, true);
    });

    await t.test("tenantContext rejects client-supplied schoolId", async () => {
        const res = await fetch(`${baseUrl}/api/v1/classes/sections/1?schoolId=999`, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        const json = await res.json();
        assert.equal(res.status, 403);
        assert.equal(json.error?.code, "CLIENT_TENANT_OVERRIDE");
    });

    await t.test("404 handler catches unknown routes", async () => {
        const res = await fetch(`${baseUrl}/api/v1/non-existent-route`);
        const json = await res.json();
        assert.equal(res.status, 404);
        assert.equal(json.error?.code, "NOT_FOUND");
    });

    await t.test("malformed JSON returns 400 INVALID_JSON", async () => {
        const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: '{"invalid": json'
        });
        const json = await res.json();
        assert.equal(res.status, 400);
        assert.equal(json.error?.code, "INVALID_JSON");
    });

    // Cleanup server and pool
    await new Promise((resolve) => server.close(resolve));
    await closeDatabasePool();
});
