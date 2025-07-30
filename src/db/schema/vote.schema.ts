import z from "zod";

export const VoteSchema = z.object({
  voterId: z.string().cuid(), // The profile ID of the voter
  voteeId: z.string().cuid(), // The profile ID of the participant being voted for
  contestId: z.string().cuid(),
  type: z.enum(["FREE", "PAID"]).default("FREE"),
});

export const VoteInsertSchema = VoteSchema;
export const VoteSelectSchema = VoteSchema.extend({
  id: z.string().cuid(),
  createdAt: z.date(),
});
