import assert from "node:assert/strict";
import test from "node:test";

import { validate } from "../src/middlewares/validate.middleware.js";
import { loginSchema } from "../src/modules/auth/auth.validator.js";

test("request validation stores parsed input", () => {
    const req = {
        body: {
            schoolCode: " PILOT-001 ",
            email: "teacher@pilotschool.example",
            password: "Teacher@12345"
        },
        query: {},
        params: {}
    };
    let error = null;

    validate(loginSchema)(req, {}, (receivedError) => {
        error = receivedError ?? null;
    });

    assert.equal(error, null);
    assert.equal(req.validated.body.schoolCode, "PILOT-001");
});

test("request validation rejects unknown fields", () => {
    const req = {
        body: {
            schoolCode: "PILOT-001",
            email: "teacher@pilotschool.example",
            password: "Teacher@12345",
            schoolId: "999"
        },
        query: {},
        params: {}
    };
    let error = null;

    validate(loginSchema)(req, {}, (receivedError) => {
        error = receivedError;
    });

    assert.equal(error.code, "VALIDATION_ERROR");
    assert.ok(error.details.some((detail) => detail.field === "body"));
});
