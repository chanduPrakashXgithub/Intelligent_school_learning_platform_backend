import app from "./app.js";
import { env } from "./config/env.js";

import { closeDatabasePool } from
    "./core/database/pool.js";

const server = app.listen(env.PORT, () => {

    console.log(`Server running on port ${env.PORT}`);

    console.log(`Environment: ${env.NODE_ENV}`);

});

let isShuttingDown = false;

const shutdown = (signal) => {

    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;

    console.log(`${signal} received. Shutting down...`);

    server.close(async (error) => {

        if (error) {
            console.error("HTTP shutdown failed:", error);
            process.exitCode = 1;
        }

        try {

            await closeDatabasePool();

            console.log("Database pool closed.");

        } catch (dbError) {

            console.error(
                "Database shutdown failed:",
                dbError
            );

            process.exitCode = 1;

        }

        console.log("Shutdown completed.");

    });

};

process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("SIGINT", () => shutdown("SIGINT"));

server.on("error", (error) => {

    console.error("HTTP server error:", error);

    process.exitCode = 1;

});