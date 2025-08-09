import z from "zod";

import type { Media } from "@/generated/prisma/index.js";

import { File_Status, Media_Type } from "@/generated/prisma/index.js";

export const MediaSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  url: z.string(),
  size: z.number().nullable(),
  type: z.string().nullable(),
  status: z.nativeEnum(File_Status),
  mediaType: z.nativeEnum(Media_Type),
  createdAt: z.date(),
  updatedAt: z.date(),
  profileId: z.string().nullable(),
  caption: z.string().nullable(),
}) satisfies z.ZodType<Media>;

export const MediaInsertSchema = MediaSchema.pick({
  mediaType: true,
  profileId: true,
});

export const MediaSelectSchema = MediaSchema;
