import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

export const PaginationResponseSchema = z.object({
  total: z.number().openapi({ example: 100 }),
  totalPages: z.number().openapi({ example: 5 }),
  hasNextPage: z.boolean().openapi({ example: true }),
  hasPreviousPage: z.boolean().openapi({ example: false }),
  nextPage: z.number().nullable().openapi({ example: 2 }),
  previousPage: z.number().nullable().openapi({ example: null }),
});

export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: z.array(dataSchema),
    pagination: PaginationResponseSchema,
  });
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationResponse;
}

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type PaginationResponse = z.infer<typeof PaginationResponseSchema>;
