import z from "zod";

import type { Profile } from "@/generated/prisma/index";

export const ProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bio: z.string().nullable(),
  avatarUrl: z.string().max(255).nullable(),
  phone: z.string().max(20).nullable().openapi({ example: "+1 210 456 2719" }),
  address: z.string(),
  city: z.string().max(100).nullable().openapi({ example: "Manhattan" }),
  country: z.string().max(100).nullable().openapi({ example: "United States" }),
  postalCode: z.string().max(20).nullable(),
  dateOfBirth: z.date().nullable(),
  gender: z.string().max(50).nullable(),
  hobbiesAndPassions: z.string().nullable(),
  paidVoterMessage: z.string().nullable(),
  freeVoterMessage: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastFreeVoteAt: z.date().nullable(),
  coverImageId: z.string().nullable(),
}) satisfies z.ZodType<Profile>;

export const ProfileInsertSchema = ProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const ProfileSelectSchema = ProfileSchema;
