import * as z from "zod";

export const RankSchema = z.object({
  id: z.string(),
  rank: z.union([z.number(), z.literal("N/A")]),
  isManualRank: z.boolean().optional(),
  profile: z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().optional(),
    username: z.string(),
    bio: z.string().optional(),
  }),
  stats: z.object({
    freeVotes: z.number(),
    paidVotes: z.number(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});
