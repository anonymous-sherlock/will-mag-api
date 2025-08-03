import { z } from "zod";

import type { Contest } from "@/generated/prisma/index";

import { AwardInsertSchema, AwardSchema } from "@/db/schema/award.schema";

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
  winnerProfileId: z.string().nullable(),
}) satisfies z.ZodType<Contest>;

export const ContestInsertSchema = ContestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  winnerProfileId: true,
}).extend({
  startDate: z.preprocess(val => val ? new Date(val as string) : new Date(), z.date()),
  endDate: z.preprocess(val => val ? new Date(val as string) : new Date(), z.date()),
});

export const ContestInsertSchemaWithAwards = ContestInsertSchema.extend({
  awards: z.array(AwardInsertSchema),
});
export const ContestSelectSchema = ContestSchema;
export const ContestSelectSchemaWithAwards = ContestSchema.extend({
  awards: z.array(AwardSchema),
});
