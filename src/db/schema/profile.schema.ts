import z from 'zod';

import type { Profile } from '@/generated/prisma/index.js';

import { MediaSelectSchema } from './media.schema';

export const ProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bio: z.string().nullable(),
  phone: z.string().max(20).nullable().openapi({ example: '+1 210 456 2719' }),
  address: z.string(),
  city: z.string().max(100).nullable().openapi({ example: 'Manhattan' }),
  country: z.string().max(100).nullable().openapi({ example: 'United States' }),
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
  instagram: z.string().max(255).nullable(),
  tiktok: z.string().max(255).nullable(),
  youtube: z.string().max(255).nullable(),
  facebook: z.string().max(255).nullable(),
  twitter: z.string().max(255).nullable(),
  linkedin: z.string().max(255).nullable(),
  website: z.string().max(255).nullable(),
  other: z.string().max(255).nullable(),
  bannerImageId: z.string().nullable(),
}) satisfies z.ZodType<Profile>;

export const ProfileInsertSchema = ProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  bannerImageId: true,
  coverImageId: true,
  lastFreeVoteAt: true,
}).extend({
  dateOfBirth: z.coerce.date().nullable().optional(),
  lastFreeVoteAt: z.coerce.date().optional().nullish(),
  instagram: z.string().max(255).nullable().optional(),
  tiktok: z.string().max(255).nullable().optional(),
  youtube: z.string().max(255).nullable().optional(),
  facebook: z.string().max(255).nullable().optional(),
  twitter: z.string().max(255).nullable().optional(),
  linkedin: z.string().max(255).nullable().optional(),
  website: z.string().max(255).nullable().optional(),
  other: z.string().max(255).nullable().optional(),
});

export const ProfileSelectSchema = ProfileSchema;

export const ProfileSelectSchemaWithMediaRelation = ProfileSchema.extend({
  coverImage: MediaSelectSchema.pick({
    id: true,
    key: true,
    caption: true,
    url: true,
  }).nullable(),
  bannerImage: MediaSelectSchema.pick({
    id: true,
    key: true,
    caption: true,
    url: true,
  }).nullable(),
  profilePhotos: z
    .array(
      MediaSelectSchema.pick({
        id: true,
        key: true,
        caption: true,
        url: true,
      })
    )
    .nullable(),
});
