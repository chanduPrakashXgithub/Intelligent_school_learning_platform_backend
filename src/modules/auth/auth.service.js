import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";

import { USER_ROLES } from "../../config/constants.js";

import { UnauthorizedError } from
    "../../core/errors/unauthorized.error.js";

import {
    findUserForLogin,
    updateLastLogin
} from "./auth.repository.js";


const INVALID_CREDENTIALS = () => {
    return new UnauthorizedError(
        "Invalid school code, email, or password",
        "INVALID_CREDENTIALS"
    );
};


export const loginUser = async ({
    schoolCode,
    email,
    password
}) => {

    // 1. Find user belonging to the requested school.
    const user = await findUserForLogin(
        schoolCode,
        email
    );

    if (!user) {
        throw INVALID_CREDENTIALS();
    }

    // 2. Check user and school account status.
    if (
        Number(user.user_is_active) !== 1 ||
        Number(user.school_is_active) !== 1
    ) {
        throw INVALID_CREDENTIALS();
    }

    // 3. Verify password.
    const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordMatches) {
        throw INVALID_CREDENTIALS();
    }

    // 4. Validate role.
    const allowedRoles = Object.values(USER_ROLES);

    if (!allowedRoles.includes(user.role)) {
        throw new UnauthorizedError(
            "User role is not configured correctly",
            "INVALID_USER_ROLE"
        );
    }

    // 5. Prepare JWT claims.
    const payload = {
        userId: String(user.id),
        schoolId: String(user.school_id),
        role: user.role
    };

    // teacher_id references users.id in this schema.
    if (user.role === USER_ROLES.TEACHER) {
        payload.teacherId = String(user.id);
    }

    // 6. Generate signed JWT.
    const token = jwt.sign(
        payload,
        env.JWT_SECRET,
        {
            algorithm: "HS256",
            expiresIn: env.JWT_EXPIRES_IN,
            issuer: "school-learning-platform",
            audience: "school-learning-platform-api"
        }
    );

    // 7. Update last login.
    await updateLastLogin(
        user.id,
        user.school_id
    );

    // 8. Return only safe user information.
    return {
        accessToken: token,
        tokenType: "Bearer",
        expiresIn: env.JWT_EXPIRES_IN,

        user: {
            id: String(user.id),
            schoolId: String(user.school_id),
            schoolCode: user.school_code,
            name: user.name,
            email: user.email,
            role: user.role
        }
    };
};