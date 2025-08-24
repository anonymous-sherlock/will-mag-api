import * as z from "zod";

export const RankSchema = z.object({
  id: z.string(),
  rank: z.coerce.number(),
  profile: z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().optional(),
    username: z.string(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});
