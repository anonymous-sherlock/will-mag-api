import z from "zod";

export const ContestParticipationSchema = z.object({
  id: z.string().cuid(),
  profileId: z.string().cuid(),
  contestId: z.string().cuid(),
  coverImageId: z.string().nullable().optional(),
  isApproved: z.boolean().default(false),
  isParticipating: z.boolean().nullable().optional().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export const ContestParticipationInsertSchema = ContestParticipationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const ContestParticipationSelectSchema = ContestParticipationSchema;
