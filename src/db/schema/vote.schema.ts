import z from "zod";

import type { Vote } from "@/generated/prisma";

import { Vote_Type } from "@/generated/prisma";

export const VoteSchema = z.object({
  id: z.string().cuid(),
  type: z.nativeEnum(Vote_Type),
  voterId: z.string(),
  voteeId: z.string(),
  contestId: z.string(),
  count: z.number(),
  paymentId: z.string().nullable(),
  comment: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<Vote>;

export const VoteInsertSchema = VoteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  paymentId: true,
  count: true,
});
export const VoteSelectSchema = VoteSchema;

export const VoteListSchema = z.object({
  votee: z
    .object({
      id: z.string().describe("The votee id"),
      name: z.string().describe("The votee name"),
      profilePicture: z.string().describe("The profile picture of the votee"),
    })
    .nullable(),
  voter: z
    .object({
      id: z.string().describe("The votee id"),
      name: z.string().describe("The votee name"),
      profilePicture: z.string().describe("The profile picture of the votee"),
    })
    .nullable(),
  totalVotes: z.coerce.number(),
  createdAt: z.string(),
});

export const GetLatestVotesResponseSchema = z.array(VoteListSchema);

export const GetVotesByProfileIdResponseSchema = z.object({
  profileId: z.string(),
  userName: z.string(),
  contestName: z.string(),
  votedOn: z.string(),
  count: z.number(),
});
