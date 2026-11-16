
import {
    pool,
    checkDatabaseConnection,
    closeDatabasePool
} from "../src/core/database/pool.js";

import { executeQuery } from
    "../src/core/database/query.js";

import { withTransaction } from
    "../src/core/database/transaction.js";

const run = async () => {

    try {

        console.log("1. Checking MySQL connection...");

        await checkDatabaseConnection();

        console.log("MySQL connection successful.");

        console.log("2. Testing parameterized query...");

        const rows = await executeQuery(
            "SELECT ? AS message, DATABASE() AS dbName",
            ["Database working"]
        );

        console.log(rows[0]);

        console.log("3. Preparing transaction test table...");

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS _transaction_test (
                id INT AUTO_INCREMENT PRIMARY KEY,
                value VARCHAR(100) NOT NULL
            ) ENGINE=InnoDB
        `);

        await pool.execute(
            "DELETE FROM _transaction_test"
        );

        console.log("4. Testing transaction rollback...");

        try {

            await withTransaction(async (connection) => {

                await connection.execute(
                    "INSERT INTO _transaction_test (value) VALUES (?)",
                    ["This should be rolled back"]
                );

                throw new Error("SIMULATED_TRANSACTION_FAILURE");

            });

        } catch (error) {

            if (
                error.message !==
                "SIMULATED_TRANSACTION_FAILURE"
            ) {
                throw error;
            }

            console.log("Expected transaction error received.");

        }

        const result = await executeQuery(
            "SELECT COUNT(*) AS total FROM _transaction_test"
        );

        const total = Number(result[0].total);

        if (total !== 0) {
            throw new Error("Transaction rollback failed!");
        }

        console.log("Transaction rollback successful.");

        console.log("ALL DATABASE TESTS PASSED.");

    } finally {

        try {
            await pool.execute(
                "DROP TABLE IF EXISTS _transaction_test"
            );
        } finally {
            await closeDatabasePool();
        }

    }

};

run().catch(error => {

    console.error("DATABASE TEST FAILED:", error);

    process.exitCode = 1;

});
