import {
    executeQuery,
    executeMutation
} from "../../core/database/query.js";

export const findUserForLogin = async (schoolCode, email) => {

    const sql = `
        SELECT
            u.id,
            u.school_id,
            u.name,
            u.email,
            u.password_hash,
            u.role,
            u.is_active AS user_is_active,
            s.code AS school_code,
            s.is_active AS school_is_active
        FROM users u
        INNER JOIN schools s
            ON s.id = u.school_id
        WHERE
            s.code = ?
            AND u.email = ?
        LIMIT 1
    `;

    const rows = await executeQuery(sql, [
        schoolCode,
        email
    ]);

    return rows[0] ?? null;
};

export const updateLastLogin = async (userId, schoolId) => {

    const sql = `
        UPDATE users
        SET last_login_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND school_id = ?
    `;

    return executeMutation(sql, [
        userId,
        schoolId
    ]);
};