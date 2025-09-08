import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";
import { z } from "zod";

import { PayVoteRequestSchema, PayVoteResponseSchema } from "@/db/schema/payments.schema";
import {
  GetTopVotersForVoteeResponseSchema,
  GetVotesByProfileIdResponseSchema,
  VoteInsertSchema,
  VoteListSchema,
  VoteSelectSchema,
} from "@/db/schema/vote.schema";
import {
  BadRequestResponse,
  NotFoundResponse,
  ServiceUnavailableResponse,
  TooManyRequestResponse,
} from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Vote"];

export const freeVote = createRoute({
  path: "/contest/vote/free",
  method: "post",
  summary: "Give a free vote",
  description:
    "Give a free vote in a contest for a profile. Free votes are limited to one per 24 hours per contest.",
  tags,
  request: {
    body: jsonContentRequired(
      VoteInsertSchema.omit({
        type: true,
      }),
      "The vote payload (voterId, voteeId, contestId, type)",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(VoteSelectSchema, "The created vote record"),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("You cannot vote for yourself"),
    [HttpStatusCodes.TOO_MANY_REQUESTS]: TooManyRequestResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Contest not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(VoteInsertSchema),
      "The validation error(s)",
    ),
  },
});

export const isFreeVoteAvailable = createRoute({
  path: "/votes/is-free-vote-available",
  method: "post",
  summary: "Check free vote status",
  description:
    "Returns whether a free vote is available for the given profileId, and if not, when it will be available.",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        profileId: z.string().describe("The profile ID to check free vote availability for"),
      }),
      "The profile ID to check free vote availability for",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        available: z.boolean(),
        nextAvailableAt: z.date().optional(),
      }),
      "Whether a free vote is available and the next available time if not.",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      z.object({ error: z.string() }),
      "Missing or invalid profileId.",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found."),
  },
});

export const payVote = createRoute({
  path: "/contest/vote/pay",
  method: "post",
  tags,
  summary: "Give a paid vote",
  description: "",
  request: {
    body: jsonContentRequired(PayVoteRequestSchema, "The validation error"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(PayVoteResponseSchema, "Payment made successfully"),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("You cannot vote for yourself"),
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: ServiceUnavailableResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export const getLatestVotes = createRoute({
  path: "/votes/latest-votes",
  method: "get",
  summary: "Get latest votes",
  description: "Get a list of latest votes",
  tags,
  request: {
    query: PaginationQuerySchema.extend({
      limit: z.number().default(20),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(VoteListSchema),
      "The latest votes",
    ),
  },
});

export const getVotesByProfileId = createRoute({
  path: "/votes/{profileId}",
  method: "get",
  tags,
  summary: "Get votes by profile id",
  description: "Get votes for a user by profile id",
  request: {
    params: z.object({
      profileId: z.string().describe("The profile ID to check for votes"),
    }),
    query: PaginationQuerySchema.extend({
      onlyPaid: z.coerce.boolean().optional().default(false).openapi({
        default: false,
      }).describe("Whether to include paid votes"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(GetVotesByProfileIdResponseSchema),
      "Votes fetched for the user successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export const getTopVotersForVotee = createRoute({
  path: "/votes/{profileId}/top-voters",
  method: "get",
  summary: "Get top 10 voters for a votee",
  description: "Get the top 10 voters who have given the highest number of votes to a specific votee profile",
  tags,
  request: {
    params: z.object({
      profileId: z.string().describe("The votee profile ID to get top voters for"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      GetTopVotersForVoteeResponseSchema,
      "The top 10 voters for this votee profile",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export type FreeVote = typeof freeVote;
export type IsFreeVoteAvailable = typeof isFreeVoteAvailable;
export type PayVote = typeof payVote;
export type GetLatestVotes = typeof getLatestVotes;
export type GetVotesByProfileId = typeof getVotesByProfileId;
export type GetTopVotersForVotee = typeof getTopVotersForVotee;
