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
      id: z.string().describe("The voter id"),
      name: z.string().describe("The voter name"),
      profilePicture: z.string().describe("The profile picture of the voter"),
    })
    .nullable(),
  totalVotes: z.coerce.number(),
  comment: z.string().nullable().describe("The comment left by the voter"),
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

export const TopVoterForVoteeSchema = z.object({
  rank: z.number().describe("The rank of this voter (1-10)"),
  profileId: z.string().describe("The voter's profile ID"),
  userName: z.string().describe("The voter's name"),
  profilePicture: z.string().describe("The voter's profile picture"),
  totalVotesGiven: z.number().describe("Total number of votes given to this votee"),
  comment: z.string().nullable().describe("The comment left by the voter"),
  lastVoteAt: z.string().describe("The timestamp of the last vote given by this voter"),
});

export const GetTopVotersForVoteeResponseSchema = z.array(TopVoterForVoteeSchema);
