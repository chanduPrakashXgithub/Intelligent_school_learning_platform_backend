
import { pool } from "./pool.js";

export const withTransaction = async (callback) => {

    // 1. Acquire a connection.
    const connection = await pool.getConnection();

    let transactionStarted = false;

    try {

        // 2. Begin transaction.
        await connection.beginTransaction();

        transactionStarted = true;

        // 3. Execute all operations using
        // the same database connection.
        const result = await callback(connection);

        // 4. Commit only if everything succeeds.
        await connection.commit();

        transactionStarted = false;

        return result;

    } catch (error) {

        // 5. Roll back if a transaction started.
        if (transactionStarted) {

            try {

                await connection.rollback();

            } catch (rollbackError) {

                console.error(
                    "Transaction rollback failed:",
                    rollbackError
                );

            }

        }

        // Preserve the original error.
        throw error;

    } finally {

        // 6. Always return connection to pool.
        connection.release();

    }

};
