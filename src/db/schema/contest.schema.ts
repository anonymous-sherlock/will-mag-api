import { z } from "zod";

import type { Contest } from "@/generated/prisma/index";

export const ContestSchema = z.object({
  id: z.string(),
  name: z.string({ message: "contest name is required" }).min(3).openapi({
    example: "Big Weekend",
  }),
  description: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  startDate: z.date(),
  prizePool: z.number(),
  endDate: z.date(),
}) satisfies z.ZodType<Contest>;

export const ContestInsertSchema = ContestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.preprocess(val => val ? new Date(val as string) : new Date(), z.date()),
  endDate: z.preprocess(val => val ? new Date(val as string) : new Date(), z.date()),
});

export const ContestSelectSchema = ContestSchema;
