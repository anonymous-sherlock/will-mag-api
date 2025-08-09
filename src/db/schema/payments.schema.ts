import { z } from "zod";

export const PayVoteRequestSchema = z.object({
  voteeId: z.string(),
  voterId: z.string(),
  contestId: z.string(),
  voteCount: z.coerce.number().int().positive(),
});

export const PayVoteResponseSchema = z.object({
  url: z.string(),
});

export const PaymentMetadataSchema = PayVoteRequestSchema.extend({
  paymentId: z.string(),
  votesMultipleBy: z.coerce.number().int().positive().optional().default(1),
});

export const PaymentHistorySchema = z.object({
  id: z.string(),
  amount: z.number(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED"]),
  stripeSessionId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  payer: z.object({
    id: z.string(),
    user: z.object({
      name: z.string(),
    }),
  }),
  votes: z.array(z.object({
    id: z.string(),
    type: z.enum(["FREE", "PAID"]),
    contest: z.object({
      id: z.string(),
      name: z.string(),
    }),
    votee: z.object({
      id: z.string(),
      user: z.object({
        name: z.string(),
      }),
    }),
    createdAt: z.date(),
  })),
});
