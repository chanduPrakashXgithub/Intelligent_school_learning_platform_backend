import { z } from "zod";

export const healthQuerySchema = z.object({
    body: z.any(),
    params: z.object({}),
    query: z.object({
        detailed: z.enum(["true", "false"]).optional()
    }).strict()
});