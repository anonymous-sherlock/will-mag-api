import { z } from "zod";

import { User_Role } from "@/generated/prisma/index.js";
import { PaginationQuerySchema } from "@/lib/queries/query.schema";

// Base search query schema with common search parameters
export const BaseSearchQuerySchema = PaginationQuerySchema.extend({
  query: z.string().optional().describe("Search query string"),
  sortBy: z.enum(["name", "createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Profile search specific schema
export const ProfileSearchQuerySchema = BaseSearchQuerySchema.extend({
  city: z.string().optional().describe("Filter by city"),
  country: z.string().optional().describe("Filter by country"),
  gender: z.string().optional().describe("Filter by gender"),
  hasAvatar: z.coerce.boolean().optional().describe("Filter profiles with/without avatar").openapi({ example: false }),
});

// Contest search specific schema
export const ContestSearchQuerySchema = BaseSearchQuerySchema.extend({
  status: z.enum(["active", "upcoming", "ended", "all", "booked"]).optional().describe("Filter by contest status"),
  minPrizePool: z.coerce.number().optional().describe("Minimum prize pool amount"),
  maxPrizePool: z.coerce.number().optional().describe("Maximum prize pool amount"),
  startDate: z.coerce.date().optional().describe("Filter contests starting from this date"),
  endDate: z.coerce.date().optional().describe("Filter contests ending before this date"),
});

// User search specific schema
export const UserSearchQuerySchema = BaseSearchQuerySchema.extend({
  role: z.nativeEnum(User_Role).optional().describe("Filter by user role"),
  isActive: z.boolean().optional().describe("Filter by active status"),
  hasProfile: z.coerce.boolean().optional().describe("Filter users with/without profile"),
});

// Response schemas
export const ProfileSearchResultSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bio: z.string().nullable(),
  coverImage: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  gender: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: z.object({
    id: z.string(),
    username: z.string().nullable(),
    displayUsername: z.string().nullable(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
  }),
});

export const ContestSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  prizePool: z.number(),
  winnerProfileId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(["active", "upcoming", "ended"]),
});

export const UserSearchResultSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["USER", "ADMIN", "MODERATOR"]),
  isActive: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  hasProfile: z.boolean(),
});

export type ProfileSearchQuery = z.infer<typeof ProfileSearchQuerySchema>;
export type ContestSearchQuery = z.infer<typeof ContestSearchQuerySchema>;
export type UserSearchQuery = z.infer<typeof UserSearchQuerySchema>;
export type ProfileSearchResult = z.infer<typeof ProfileSearchResultSchema>;
export type ContestSearchResult = z.infer<typeof ContestSearchResultSchema>;
export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;
