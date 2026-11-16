
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { pool } from "../core/database/pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDirectory = path.join(
    __dirname,
    "migrations"
);

export const runMigrations = async () => {

    const connection = await pool.getConnection();

    let lockAcquired = false;

    try {

        // Prevent two migration processes running together.
        const [lockRows] = await connection.query(
            "SELECT GET_LOCK(?, 10) AS acquired",
            ["school_learning_platform_migrations"]
        );

        if (Number(lockRows[0].acquired) !== 1) {
            throw new Error("Could not acquire migration lock.");
        }

        lockAcquired = true;

        // Create migration history table.
        await connection.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

                version VARCHAR(100) NOT NULL,

                filename VARCHAR(255) NOT NULL,

                checksum CHAR(64) NOT NULL,

                applied_at TIMESTAMP NOT NULL
                    DEFAULT CURRENT_TIMESTAMP,

                UNIQUE KEY uq_migration_version (version)
            ) ENGINE=InnoDB
        `);

        // Read migration filenames.
        const files = await fs.readdir(migrationsDirectory);

        const migrationFiles = files
            .filter(file => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
            .sort((a, b) => a.localeCompare(b));

        for (const file of migrationFiles) {

            const version = file.split("_")[0];

            const filePath = path.join(
                migrationsDirectory,
                file
            );

            const sql = await fs.readFile(
                filePath,
                "utf8"
            );

            const checksum = crypto
                .createHash("sha256")
                .update(sql)
                .digest("hex");

            // Check whether migration was already applied.
            const [existing] = await connection.execute(
                `SELECT checksum
                 FROM schema_migrations
                 WHERE version = ?`,
                [version]
            );

            if (existing.length > 0) {

                if (existing[0].checksum !== checksum) {
                    throw new Error(
                        `Applied migration ${file} was modified.`
                    );
                }

                console.log(`SKIPPED: ${file}`);

                continue;
            }

            console.log(`RUNNING: ${file}`);

            // This simple migration format supports ordinary
            // SQL statements separated by semicolons.
            const statements = sql
                .split(";")
                .map(statement => statement.trim())
                .filter(Boolean);

            for (const statement of statements) {
                await connection.query(statement);
            }

            // Record only after all statements succeed.
            await connection.execute(
                `INSERT INTO schema_migrations
                 (version, filename, checksum)
                 VALUES (?, ?, ?)`,
                [version, file, checksum]
            );

            console.log(`APPLIED: ${file}`);

        }

        console.log("Migration execution completed.");

    } finally {

        if (lockAcquired) {

            try {
                await connection.query(
                    "SELECT RELEASE_LOCK(?)",
                    ["school_learning_platform_migrations"]
                );
            } catch (error) {
                console.error("Could not release migration lock:", error);
            }

        }

        connection.release();

    }

};
