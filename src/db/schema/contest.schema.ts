import { z } from "zod";

import type { Contest } from "@/generated/prisma/index.js";
import type { Decimal } from "@/generated/prisma/runtime/library";

import { AwardInsertSchema, AwardSchema } from "@/db/schema/award.schema";
import { Contest_Status, Contest_Visibility } from "@/generated/prisma/index.js";

import { MediaSelectSchema } from "./media.schema";

export const ContestSchema = z.object({
  id: z.string(),
  name: z.string({ message: "contest name is required" }).min(3).openapi({
    example: "Big Weekend",
  }),
  description: z.string(),
  prizePool: z.number(),
  startDate: z.date(),
  endDate: z.date(),
  registrationDeadline: z.date().nullable(),
  resultAnnounceDate: z.date().nullable(),
  slug: z.string(),
  status: z.nativeEnum(Contest_Status),
  visibility: z.nativeEnum(Contest_Visibility),
  isFeatured: z.boolean(),
  isVerified: z.boolean(),
  isVotingEnabled: z.boolean(),
  rules: z.string().nullable(),
  requirements: z.string().nullable(),
  winnerProfileId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<Contest>;

export const ContestInsertSchema = ContestSchema.pick({
  name: true,
  description: true,
  prizePool: true,
  slug: true,
  status: true,
  visibility: true,

}).extend({
  startDate: z.preprocess(val => val ? new Date(val as string) : new Date(), z.date()),
  endDate: z.preprocess(val => val ? new Date(val as string) : new Date(), z.date()),
  slug: z.string().optional(),
  rules: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
});

export const ContestInsertSchemaWithAwards = ContestInsertSchema.extend({
  awards: z.array(AwardInsertSchema),
});
export const ContestSelectSchema = ContestSchema;
export const ContestSelectSchemaWithAwards = ContestSchema.extend({
  awards: z.array(AwardSchema),
});

export const ContestSelectSchemaWithAwardsandImages = ContestSelectSchemaWithAwards.extend({
  images: z.array(MediaSelectSchema.pick({
    id: true,
    key: true,
    caption: true,
    url: true,
  })).nullable(),
});
