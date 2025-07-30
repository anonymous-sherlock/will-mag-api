import z from "zod";

export const ProfileSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().max(255).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string(),
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  dateOfBirth: z.date().nullable().optional(),
  gender: z.string().max(50).nullable().optional(),
  hobbiesAndPassions: z.string().nullable().optional(),
  paidVoterMessage: z.string().nullable().optional(),
  freeVoterMessage: z.string().nullable().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  lastFreeVoteAt: z.date().nullable().optional(),
  coverImageId: z.string().nullable().optional(),
});

export const ProfileInsertSchema = ProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const ProfileSelectSchema = ProfileSchema;
