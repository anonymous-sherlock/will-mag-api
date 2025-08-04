import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { z } from "zod";

import { VoteMultiplierInsertSchema, VoteMultiplierSelectSchema } from "@/db/schema/vote-multiplier.schema";
import { BadRequestResponse, ConflictResponse, NotFoundResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

export const createVoteMultiplierPeriod = createRoute({
  method: "post",
  path: "/vote-multiplier-periods",
  tags: ["Vote Multiplier Periods"],
  summary: "Create a new vote multiplier period",
  description: "Create a new vote multiplier period for paid votes",
  request: {
    body: jsonContentRequired(
      VoteMultiplierInsertSchema,
      "The Vote Multiplier to create",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      VoteMultiplierSelectSchema,
      "The created vote multiplier",
    ),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Something Went wrong"),
    [HttpStatusCodes.CONFLICT]: ConflictResponse("Vote multiplier period already exists for this time range"),
  },
});

export const getVoteMultiplierPeriods = createRoute({
  method: "get",
  path: "/vote-multiplier-periods",
  tags: ["Vote Multiplier Periods"],
  summary: "Get all vote multiplier periods",
  description: "Retrieve all vote multiplier periods with pagination",
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(VoteMultiplierSelectSchema),
      "The vote multiplier lists",
    ),
    [HttpStatusCodes.CONFLICT]: ConflictResponse("already has active vote multplier"),
  },
});

export const getActiveVoteMultiplier = createRoute({
  method: "get",
  path: "/vote-multiplier-periods/active",
  tags: ["Vote Multiplier Periods"],
  summary: "Get active vote multiplier period",
  description: "Get the currently active vote multiplier period",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      VoteMultiplierSelectSchema.nullable(),
      "Active vote multiplier period retrieved successfully",
    ),

  },
});

export const updateVoteMultiplierPeriod = createRoute({
  method: "put",
  path: "/vote-multiplier-periods/{id}",
  tags: ["Vote Multiplier Periods"],
  summary: "Update a vote multiplier period",
  description: "Update an existing vote multiplier period",
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContentRequired(
      VoteMultiplierInsertSchema,
      "The Vote Multiplier to update",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      VoteMultiplierSelectSchema,
      "The created vote multiplier",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Vote multiplier not found"),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("End time must be after start time"),
    [HttpStatusCodes.CONFLICT]: ConflictResponse("A vote multiplier period already existss"),
  },
});

export const deleteVoteMultiplierPeriod = createRoute({
  method: "delete",
  path: "/vote-multiplier-periods/{id}",
  tags: ["Vote Multiplier Periods"],
  summary: "Delete a vote multiplier period",
  description: "Delete an existing vote multiplier period",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "Vote multiplier deleted",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Vote multiplier not found"),

  },
});
