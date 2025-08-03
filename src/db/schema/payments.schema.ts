import { z } from 'zod';

export const PayVoteRequestSchema = z.object({
  voteeId: z.string(),
  voterId: z.string(),
  contestId: z.string(),
  voteCount: z.string(),
});

export const PayVoteResponseSchema = z.object({
  url: z.string(),
});

export const PaymentMetadataSchema = PayVoteRequestSchema.extend({
  paymentId: z.string(),
});
