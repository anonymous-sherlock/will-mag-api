import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { ContestParticipationInsertSchema, ContestParticipationLeaveSchema, ContestParticipationSelectSchema } from "@/db/schema/contest-participation.schema";
import { ContestSelectSchema, ContestSelectSchemaWithAwards } from "@/db/schema/contest.schema";
import { ProfileSelectSchema } from "@/db/schema/profile.schema";
import { UserSelectSchema } from "@/db/schema/users.schema";
import { ConflictResponse, NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Contest Participation"];

export const join = createRoute({
  path: "/contest/join",
  method: "post",
  summary: "Join Contest",
  description: "Join a user (profile) to a contest.",
  tags,
  request: {
    body: jsonContentRequired(
      ContestParticipationInsertSchema,
      "The join contest payload (profileId, contestId, coverImage)",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ContestParticipationSelectSchema.extend({
        contest: ContestSelectSchema,
      }),
      "The created contest participation record with contest details",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
    [HttpStatusCodes.CONFLICT]: ConflictResponse("Participant already joined the contest"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ContestParticipationInsertSchema),
      "The validation error(s)",
    ),
  },
});

export const leave = createRoute({
  path: "/contest/leave",
  method: "post",
  summary: "Leave Contest",
  description: "Leave a contest by removing the participation record.",
  tags,
  request: {
    body: jsonContentRequired(
      ContestParticipationLeaveSchema,
      "The leave contest payload (profileId, contestId)",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ContestParticipationSelectSchema,
      "The deleted contest participation record",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Contest participation not found"),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ContestParticipationInsertSchema),
      "The validation error(s)",
    ),
  },
});

export const getParticipants = createRoute({
  path: "/contest/{contestId}/participants",
  method: "get",
  tags,
  summary: "Get Contest Participants",
  description: "Get all participants of a specific contest",
  request: {
    params: z.object({
      contestId: z.string().describe("The contest ID"),
    }),
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(
        ContestParticipationSelectSchema.omit({
          profileId: true,
        }).extend({
          profile: ProfileSelectSchema.pick({
            id: true,
            bio: true,
            freeVoterMessage: true,
            hobbiesAndPassions: true,
            paidVoterMessage: true,
          }).extend({
            user: UserSelectSchema.pick({
              id: true,
              email: true,
              name: true,
              image: true,
            }).nullable(),
          }).nullable(),

        }),
      ),
      "The contest participants list",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Contest not found"),
  },
});

export const getContestWinner = createRoute({
  path: "/contest/{id}/winner",
  method: "get",
  tags,
  summary: "Get Contest Winner",
  description: "Get the winner of a specific contest",
  request: {
    params: z.object({
      id: z.string().describe("The contest ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        winner: ProfileSelectSchema.nullable(),
        totalParticipants: z.number(),
        totalVotes: z.number(),
      }),
      "The contest winner information",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Contest not found"),
  },
});

export const setContestWinner = createRoute({
  path: "/contest/{id}/winner",
  method: "post",
  tags,
  summary: "Set Contest Winner",
  description: "Set the winner of a specific contest",
  request: {
    params: z.object({
      id: z.string().describe("The contest ID"),
    }),
    body: jsonContentRequired(
      ContestParticipationInsertSchema.pick({
        profileId: true
      }),
      "The winner profile ID",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        contest: ContestSelectSchemaWithAwards,
        winner: ProfileSelectSchema.nullable(),
        totalParticipants: z.number(),
        totalVotes: z.number(),
      }),
      "The contest winner information",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Contest not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        winnerProfileId: z.string(),
      })),
      "The validation error(s)",
    ),
  },
});

export type JoinRoute = typeof join;
export type LeaveRoute = typeof leave;
export type GetParticipantsRoute = typeof getParticipants;
export type GetContestWinnerRoute = typeof getContestWinner;
export type SetContestWinnerRoute = typeof setContestWinner;
