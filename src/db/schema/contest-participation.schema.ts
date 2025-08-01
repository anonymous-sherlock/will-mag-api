import { z } from "zod";

import type { ContestParticipation } from "@/generated/prisma/index";

export const ContestParticipationSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  contestId: z.string(),
  coverImage: z.string().nullable(),
  isApproved: z.boolean().openapi({ example: false }),
  isParticipating: z.boolean().nullable().openapi({ example: true }),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<ContestParticipation>;

export const ContestParticipationInsertSchema = ContestParticipationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isApproved: true,
}).extend({
  isParticipating: z.boolean().optional(),
});

export const ContestParticipationSelectSchema = ContestParticipationSchema;
