import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { AwardInsertSchema, AwardSelectSchema } from "@/db/schema/award.schema";
import { NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";

const tags = ["Awards"];
const awardsWithContestTags = [...tags, "Contest"];

export const createContestAwards = createRoute({
  path: "/contest/{contestId}/awards",
  method: "post",
  tags: awardsWithContestTags,
  summary: "Create Contest Awards",
  description: "Create awards for a specific contest",
  request: {
    params: z.object({
      contestId: z.string().describe("The contest ID"),
    }),
    body: jsonContentRequired(
      z.array(AwardInsertSchema),
      "The awards to create for the contest",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.array(AwardSelectSchema),
      "The created awards",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.array(AwardInsertSchema)),
      "The validation error(s)",
    ),
  },
});

export const getContestAwards = createRoute({
  path: "/contest/{contestId}/awards",
  method: "get",
  tags: awardsWithContestTags,
  summary: "Get Contest Awards",
  description: "Get all awards for a specific contest",
  request: {
    params: z.object({
      contestId: z.string().describe("The contest ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(AwardSelectSchema),
      "The contest awards",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export const getAward = createRoute({
  path: "/awards/{id}",
  method: "get",
  tags,
  summary: "Get Award",
  description: "Get a specific award by ID",
  request: {
    params: z.object({
      id: z.string().describe("The award ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      AwardSelectSchema,
      "The award",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export const deleteAward = createRoute({
  path: "/awards/{id}",
  method: "delete",
  tags,
  summary: "Delete Award",
  description: "Delete a specific award by ID",
  request: {
    params: z.object({
      id: z.string().describe("The award ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "Award deleted successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export const updateAward = createRoute({
  path: "/awards/{id}",
  method: "patch",
  tags,
  summary: "Update Award",
  description: "Update a specific award by ID",
  request: {
    params: z.object({
      id: z.string().describe("The award ID"),
    }),
    body: jsonContentRequired(
      AwardInsertSchema.partial(),
      "The award data to update",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      AwardSelectSchema,
      "The updated award",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(AwardInsertSchema.partial()),
      "The validation error(s)",
    ),
  },
});

export type CreateContestAwardsRoute = typeof createContestAwards;
export type GetContestAwardsRoute = typeof getContestAwards;
export type GetAwardRoute = typeof getAward;
export type DeleteAwardRoute = typeof deleteAward;
export type UpdateAwardRoute = typeof updateAward;
