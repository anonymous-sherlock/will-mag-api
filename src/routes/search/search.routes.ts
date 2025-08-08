import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { createPaginatedResponseSchema } from "@/lib/queries/query.schema";

import {
  ContestSearchQuerySchema,
  ContestSearchResultSchema,
  ProfileSearchQuerySchema,
  ProfileSearchResultSchema,
} from "./search.schema";

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
    query: ContestSearchQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ContestSearchResultSchema),
      "Contests found successfully",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(ContestSearchQuerySchema),
      "Invalid search parameters",
    ),
  },
});

export type SearchProfiles = typeof searchProfiles;
export type SearchContests = typeof searchContests;
