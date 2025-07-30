import * as z from 'zod';

export const RankSchema = z.object({
  name: z.string(),
  votesRecieved: z.coerce.number(),
  profileId: z.string(),
});
