
import { pool } from "./pool.js";

// Execute SELECT queries.
export const executeQuery = async (sql, params = []) => {

    const [rows] = await pool.execute(sql, params);

    return rows;

};

// Execute INSERT, UPDATE and DELETE queries.
export const executeMutation = async (sql, params = []) => {

    const [result] = await pool.execute(sql, params);

    return {
        affectedRows: result.affectedRows,
        insertId: result.insertId,
        changedRows: result.changedRows
    };

};
