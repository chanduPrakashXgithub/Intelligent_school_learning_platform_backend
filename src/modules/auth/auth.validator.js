import { z } from "zod";

export const loginSchema = z.object({
    body: z.object({
        schoolCode: z.string().trim().min(1).max(50),
        email: z.string().trim().email().max(254),
        password: z.string().min(1).max(128)
    }).strict(),

    params: z.object({}).strict(),

    query: z.object({}).strict()
});