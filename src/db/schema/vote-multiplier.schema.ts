import { z } from "zod";

import type { VoteMultiplierPeriod } from "@/generated/prisma/index.js";

export const VoteMultiplierSchema = z.object({
  id: z.string(),
  multiplierTimes: z.number(),
  isActive: z.boolean(),
  startTime: z.coerce.date().openapi({ example: "2025-08-02T12:34:56.000Z" }),
  endTime: z.coerce.date().openapi({ example: "2025-08-02T12:34:56.000Z" }),
  createdAt: z.coerce.date().openapi({ example: "2025-08-02T12:34:56.000Z" }),
  updatedAt: z.coerce.date().openapi({ example: "2025-08-02T12:34:56.000Z" }),
}) satisfies z.ZodType<VoteMultiplierPeriod>;

export const VoteMultiplierInsertSchema = VoteMultiplierSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const VoteMultiplierSelectSchema = VoteMultiplierSchema;

export type VoteMultiplierSchemaType = z.infer<typeof VoteMultiplierSchema>;
