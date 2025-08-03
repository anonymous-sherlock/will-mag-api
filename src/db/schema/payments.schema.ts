import { z } from 'zod';

export const PayVoteRequestSchema = z.object({
  userId: z.string(),
  voteCount: z.coerce.number().min(5),
  contestId: z.string(),
});

export const PayVoteResponseSchema = z.object({
  url: z.string(),
});
