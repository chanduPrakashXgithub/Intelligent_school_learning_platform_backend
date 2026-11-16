import { z } from "zod";

export const sectionParamsSchema = z.object({
    body: z.object({}).strict(),
    query: z.object({}).strict(),
    params: z.object({
        sectionId: z.coerce.number().int().positive()
    }).strict()
});
