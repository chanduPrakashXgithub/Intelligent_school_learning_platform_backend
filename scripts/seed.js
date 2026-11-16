
import fs from "node:fs/promises";

import { pool, closeDatabasePool } from
    "../src/core/database/pool.js";

const seedFile = new URL(
    "../src/database/seeds/001_pilot_school_seed.sql",
    import.meta.url
);

const main = async () => {

    const connection = await pool.getConnection();

    try {

        const sql = await fs.readFile(seedFile, "utf8");

        const statements = sql
            .split(";")
            .map(statement => statement.trim())
            .filter(Boolean);

        await connection.beginTransaction();

        for (const statement of statements) {

            await connection.query(statement);

        }

        await connection.commit();

        console.log("Pilot school seed completed.");

    } catch (error) {

        await connection.rollback();

        console.error("Seed execution failed:", error);

        process.exitCode = 1;

    } finally {

        connection.release();

        await closeDatabasePool();

    }

};

main();
