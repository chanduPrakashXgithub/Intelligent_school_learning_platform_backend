import { classRepository } from
    "../src/modules/classes/class.repository.js";

import { pool, closeDatabasePool } from
    "../src/core/database/pool.js";

const main = async () => {

    try {

        const [schools] = await pool.execute(
            "SELECT id, name FROM schools ORDER BY id"
        );

        if (schools.length < 2) {
            throw new Error("Two schools are required for this test");
        }

        const schoolA = String(schools[0].id);
        const schoolB = String(schools[1].id);

        const [classes] = await pool.execute(
            `SELECT id
             FROM classes
             WHERE school_id = ?
             ORDER BY id
             LIMIT 1`,
            [schoolA]
        );

        if (classes.length === 0) {
            throw new Error("School A has no classes");
        }

        const classId = String(classes[0].id);

        console.log("Testing School A access...");

        const allowed = await classRepository.findById(
            classId,
            schoolA
        );

        if (!allowed) {
            throw new Error("School A should access its own class");
        }

        console.log("PASS: School A can access its class.");

        console.log("Testing School B access to School A class...");

        const denied = await classRepository.findById(
            classId,
            schoolB
        );

        if (denied !== null) {
            throw new Error("TENANT ISOLATION FAILURE");
        }

        console.log("PASS: School B cannot access School A class.");

        console.log("ALL TENANT REPOSITORY TESTS PASSED.");

    } finally {

        await closeDatabasePool();

    }

};

main().catch(error => {

    console.error("TENANT TEST FAILED:", error);

    process.exitCode = 1;

});