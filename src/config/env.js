
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum([
        "development",
        "production",
        "test"
    ]).default("development"),

    PORT: z.coerce.number()
        .int()
        .min(1)
        .max(65535)
        .default(5000),

    CORS_ORIGINS: z.string()
        .default("http://localhost:3000"),

    DB_HOST: z.string().min(1),

    DB_PORT: z.coerce.number()
        .int()
        .min(1)
        .max(65535)
        .default(3306),

    DB_USER: z.string().min(1),

    DB_PASSWORD: z.string(),

    DB_NAME: z.string().min(1),

    JWT_SECRET: z.string().min(32),

    JWT_EXPIRES_IN: z.string().default("15m")
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error("Environment configuration error:");

    console.error(
        result.error.flatten().fieldErrors
    );

    process.exit(1);
}

export const env = Object.freeze({
    ...result.data,

    CORS_ORIGINS: result.data.CORS_ORIGINS
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean)
});
