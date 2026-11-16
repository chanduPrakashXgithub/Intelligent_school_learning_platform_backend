
import bcrypt from "bcrypt";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { pool } from "../src/core/database/pool.js";

const rl = readline.createInterface({
    input: stdin,
    output: stdout
});

function readHidden(prompt) {
    return new Promise((resolve, reject) => {
        if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
            reject(new Error("A TTY terminal is required for hidden password input."));
            return;
        }

        stdout.write(prompt);

        let value = "";

        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding("utf8");

        const cleanup = () => {
            stdin.removeListener("data", onData);
            stdin.setRawMode(false);
            stdout.write("\n");
        };

        const onData = (chunk) => {
            for (const char of chunk) {
                if (char === "\u0003") {
                    cleanup();
                    reject(new Error("Operation cancelled."));
                    return;
                }

                if (char === "\r" || char === "\n") {
                    cleanup();
                    resolve(value);
                    return;
                }

                if (char === "\u007f" || char === "\b") {
                    value = value.slice(0, -1);
                    continue;
                }

                if (char >= " " && char !== "\u007f") {
                    value += char;
                }
            }
        };

        stdin.on("data", onData);
    });
}

async function createAdmin() {
    try {
        const schoolCode = (
            await rl.question("School code: ")
        ).trim();

        const name = (
            await rl.question("Admin name: ")
        ).trim();

        const email = (
            await rl.question("Admin email: ")
        ).trim();

        const password = await readHidden("Password: ");
        const confirmPassword = await readHidden("Confirm password: ");

        if (!schoolCode || !name || !email) {
            throw new Error("School code, name and email are required.");
        }

        if (name.length > 150 || email.length > 255) {
            throw new Error("Name or email exceeds the allowed length.");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("Enter a valid email address.");
        }

        if (password.length < 12 || password.length > 128) {
            throw new Error("Password must contain 12–128 characters.");
        }

        if (password !== confirmPassword) {
            throw new Error("Passwords do not match.");
        }

        // 1. Find active school.
        const [schools] = await pool.execute(
            `SELECT id, code, name
             FROM schools
             WHERE code = ? AND is_active = 1
             LIMIT 1`,
            [schoolCode]
        );

        const school = schools[0];

        if (!school) {
            throw new Error("Active school not found.");
        }

        // 2. Check for duplicate email within this school.
        const [existingUsers] = await pool.execute(
            `SELECT id
             FROM users
             WHERE school_id = ? AND email = ?
             LIMIT 1`,
            [school.id, email]
        );

        if (existingUsers.length > 0) {
            throw new Error("An account with this email already exists in this school.");
        }

        // 3. Hash password. Never store plaintext passwords.
        const passwordHash = await bcrypt.hash(password, 12);

        // 4. Insert school administrator.
        const [result] = await pool.execute(
            `INSERT INTO users (
                school_id,
                name,
                email,
                password_hash,
                role,
                is_active
            )
            VALUES (?, ?, ?, ?, 'SCHOOL_ADMIN', 1)`,
            [school.id, name, email, passwordHash]
        );

        console.log("\nAdmin account created successfully.");
        console.log({
            userId: String(result.insertId),
            schoolId: String(school.id),
            schoolCode: school.code,
            role: "SCHOOL_ADMIN",
            email
        });

    } finally {
        rl.close();
        await pool.end();
    }
}

createAdmin().catch((error) => {
    console.error("\nAdmin creation failed:", error.message);
    process.exitCode = 1;
});
