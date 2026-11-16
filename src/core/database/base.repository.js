
import { executeQuery } from "./query.js";

const ALLOWED_TABLES = new Set([
    "academic_years",
    "classes",
    "sections",
    "subjects",
    "users",
    "teacher_assignments",
]);

function validateSchoolId(schoolId) {
    const value = String(schoolId ?? "");

    if (!/^[1-9]\d*$/.test(value)) {
        throw new TypeError("Invalid school ID");
    }

    return value;
}

function validateId(id) {
    const value = String(id ?? "");

    if (!/^[1-9]\d*$/.test(value)) {
        throw new TypeError("Invalid record ID");
    }

    return value;
}

export class BaseRepository {
    constructor(tableName) {
        if (!ALLOWED_TABLES.has(tableName)) {
            throw new Error(`Repository table not allowed: ${tableName}`);
        }

        this.tableName = tableName;
    }

    async findById(id, schoolId) {
        const validId = validateId(id);
        const validSchoolId = validateSchoolId(schoolId);

        const sql = `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE id = ?
        AND school_id = ?
      LIMIT 1
    `;

        const rows = await executeQuery(sql, [
            validId,
            validSchoolId,
        ]);

        return rows[0] ?? null;
    }

    async findAll(schoolId, limit = 50, offset = 0) {
        const validSchoolId = validateSchoolId(schoolId);

        if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 100
        ) {
            throw new TypeError("Invalid limit");
        }

        if (!Number.isInteger(offset) || offset < 0) {
            throw new TypeError("Invalid offset");
        }

        const sql = `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE school_id = ?
      ORDER BY id
      LIMIT ?
      OFFSET ?
    `;

        return executeQuery(sql, [
            validSchoolId,
            limit,
            offset,
        ]);
    }

    async count(schoolId) {
        const validSchoolId = validateSchoolId(schoolId);

        const sql = `
      SELECT COUNT(*) AS total
      FROM \`${this.tableName}\`
      WHERE school_id = ?
    `;

        const rows = await executeQuery(sql, [validSchoolId]);

        return Number(rows[0].total);
    }
}
