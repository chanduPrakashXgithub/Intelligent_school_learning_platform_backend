import { runMigrations } from
    "../src/database/migrator.js";

import { closeDatabasePool } from
    "../src/core/database/pool.js";

const main = async () => {

    try {

        await runMigrations();

    } catch (error) {

        console.error("Migration failed:", error);

        process.exitCode = 1;

    } finally {

        await closeDatabasePool();

    }

};

main();