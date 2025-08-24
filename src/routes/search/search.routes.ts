import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { ContestSelectSchema } from "@/db/schema/contest.schema";
import { createPaginatedResponseSchema } from "@/lib/queries/query.schema";

import {
  ContestSearchQuerySchema,
  ProfileSearchQuerySchema,
  ProfileSearchResultSchema,
  UserSearchQuerySchema,
  UserSearchResultSchema,
} from "../../db/schema/search.schema";

const tags = ["Search"];

export const searchProfiles = createRoute({
  path: "/search/profiles",
  method: "get",
  tags,
  summary: "Search profiles",
  description: "Search and filter profiles with pagination support",
  request: {
    query: ProfileSearchQuerySchema.extend({
      sortBy: z.enum(["name", "username", "createdAt"]).optional().default("createdAt"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ProfileSearchResultSchema),
      "Profiles found successfully",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(ProfileSearchQuerySchema),
      "Invalid search parameters",
    ),
  },
});

export const searchContests = createRoute({
  path: "/search/contests",
  method: "get",
  tags,
  summary: "Search contests",
  description: "Search and filter contests with pagination support",
  request: {
    query: ContestSearchQuerySchema.extend({
      sortBy: z.enum(["name", "startDate", "endDate", "prizePool", "createdAt"]).optional().default("createdAt"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ContestSelectSchema),
      "Contests found successfully",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(ContestSearchQuerySchema),
      "Invalid search parameters",
    ),
  },
});

export const searchUsers = createRoute({
  path: "/search/users",
  method: "get",
  tags,
  summary: "Search users",
  description: "Search and filter users with pagination support",
  request: {
    query: UserSearchQuerySchema.extend({
      sortBy: z.enum(["name", "createdAt", "email", "username", "emailVerified", "hasProfile", "role"]).optional().default("createdAt"),
      search: z.string().optional(),
      type: z.enum(["MODEL", "VOTER"]).optional().openapi({
        description: "Filter by user type",
        example: "MODEL",
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(UserSearchResultSchema),
      "Users found successfully",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(UserSearchQuerySchema),
      "Invalid search parameters",
    ),
  },
});

export type SearchProfiles = typeof searchProfiles;
export type SearchContests = typeof searchContests;
export type SearchUsers = typeof searchUsers;
