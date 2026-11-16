
import mysql from "mysql2/promise";

import { databaseConfig } from
    "../../config/database.js";

export const pool = mysql.createPool({
    ...databaseConfig,

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0,

    enableKeepAlive: true,

    keepAliveInitialDelay: 0,
    supportBigNumbers: true,
    bigNumberStrings: true,

    connectTimeout: 10000
});

// Verify that MySQL is reachable.
export const checkDatabaseConnection = async () => {

    let connection;

    try {

        connection = await pool.getConnection();

        await connection.ping();

        return true;

    } finally {

        if (connection) {
            connection.release();
        }

    }
};

// Close all pool connections during shutdown.
export const closeDatabasePool = async () => {

    await pool.end();

};
