import assert from "node:assert/strict";
import test from "node:test";

import { authorizeRole } from "../src/middlewares/authorize.middleware.js";
import {
    createTeacherSectionAssignmentMiddleware
} from "../src/middlewares/teacher-assignment.middleware.js";
import { tenantContext } from "../src/middlewares/tenant-context.middleware.js";
import { USER_ROLES } from "../src/config/constants.js";

const runMiddleware = async (middleware, req) => {
    let receivedError = null;
    let continued = false;

    await middleware(req, {
        locals: {},
        setHeader() {}
    }, (error) => {
        receivedError = error ?? null;
        continued = !error;
    });

    return { receivedError, continued };
};

test("tenant context is server-authoritative", async () => {
    const req = {
        user: { schoolId: "7" },
        headers: {},
        query: {},
        body: {},
        params: {}
    };

    const result = await runMiddleware(tenantContext, req);

    assert.equal(result.receivedError, null);
    assert.deepEqual(req.context, { schoolId: "7" });
});

test("tenant context rejects client tenant overrides", async () => {
    const req = {
        user: { schoolId: "7" },
        headers: {},
        query: { schoolId: "8" },
        body: {},
        params: {}
    };

    const result = await runMiddleware(tenantContext, req);

    assert.equal(result.receivedError.code, "CLIENT_TENANT_OVERRIDE");
    assert.equal(result.receivedError.statusCode, 403);
});

test("role authorization denies roles outside the allowlist", async () => {
    const req = { user: { role: USER_ROLES.STUDENT } };
    const result = await runMiddleware(
        authorizeRole(USER_ROLES.ADMIN, USER_ROLES.TEACHER),
        req
    );

    assert.equal(result.receivedError.code, "ROLE_ACCESS_DENIED");
    assert.equal(result.receivedError.statusCode, 403);
});

test("teacher assignment authorization allows assigned sections", async () => {
    const query = async () => [{ id: 11 }];
    const middleware = createTeacherSectionAssignmentMiddleware(query);
    const req = {
        user: { role: USER_ROLES.TEACHER, teacherId: "4" },
        context: { schoolId: "7" },
        params: { sectionId: "11" }
    };

    const result = await runMiddleware(middleware, req);

    assert.equal(result.receivedError, null);
    assert.equal(result.continued, true);
});

test("teacher assignment authorization denies unassigned sections", async () => {
    const query = async () => [];
    const middleware = createTeacherSectionAssignmentMiddleware(query);
    const req = {
        user: { role: USER_ROLES.TEACHER, teacherId: "4" },
        context: { schoolId: "7" },
        params: { sectionId: "11" }
    };

    const result = await runMiddleware(middleware, req);

    assert.equal(result.receivedError.code, "SECTION_ASSIGNMENT_REQUIRED");
    assert.equal(result.receivedError.statusCode, 403);
});

test("administrators bypass teacher assignment checks", async () => {
    let queryCalled = false;
    const middleware = createTeacherSectionAssignmentMiddleware(async () => {
        queryCalled = true;
        return [];
    });
    const req = {
        user: { role: USER_ROLES.ADMIN },
        context: { schoolId: "7" },
        params: { sectionId: "11" }
    };

    const result = await runMiddleware(middleware, req);

    assert.equal(result.receivedError, null);
    assert.equal(result.continued, true);
    assert.equal(queryCalled, false);
});
