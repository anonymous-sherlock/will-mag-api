import { z } from "zod";

import type { ContestParticipation } from "@/generated/prisma/index.js";

export const ContestParticipationSchema = z.object({
  id: z.string().describe("Unique identifier of the contest participation record"),
  profileId: z.string().describe("ID of the profile that is participating in the contest"),
  contestId: z.string().describe("ID of the contest"),
  coverImage: z
    .string()
    .nullable()
    .describe("Optional URL of the participant's cover image"),
  isApproved: z
    .boolean()
    .openapi({ example: false })
    .describe("Whether the participation has been approved by an admin or moderator"),
  isParticipating: z
    .boolean()
    .nullable()
    .openapi({ example: true })
    .describe("Whether the profile is currently participating in the contest"),
  createdAt: z
    .date()
    .describe("Date and time when the participation record was created"),
  updatedAt: z
    .date()
    .describe("Date and time when the participation record was last updated"),
}) satisfies z.ZodType<ContestParticipation>;

export const ContestParticipationInsertSchema = ContestParticipationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isApproved: true,
}).extend({
  isParticipating: z
    .boolean()
    .optional()
    .describe("Optional flag to mark whether the profile is currently participating"),
});

export const ContestParticipationLeaveSchema = ContestParticipationInsertSchema.pick({
  contestId: true,
  profileId: true
});

export const ContestParticipationSelectSchema = ContestParticipationSchema;
