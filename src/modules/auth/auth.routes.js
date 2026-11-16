import { Router } from "express";

import { validate } from
    "../../middlewares/validate.middleware.js";

import { authenticate } from
    "../../middlewares/authenticate.middleware.js";

import { tenantContext } from
    "../../middlewares/tenant-context.middleware.js";

import { login, getCurrentUser } from
    "./auth.controller.js";

import { loginSchema } from
    "./auth.validator.js";

const router = Router();

// Public endpoint: user logs in to receive a JWT.
router.post(
    "/login",
    validate(loginSchema),
    login
);

// Protected endpoint: verify JWT and resolve tenant context.
router.get(
    "/me",
    authenticate,
    tenantContext,
    getCurrentUser
);

export default router;