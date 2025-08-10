import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import {
  ContestInsertSchema,
  ContestInsertSchemaWithAwards,
  ContestSelectSchema,
  ContestSelectSchemaWithAwards,
  ContestSelectSchemaWithAwardsandImages,
} from "@/db/schema/contest.schema";
import { BadRequestResponse, NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Contest"];

export const list = createRoute({
  path: "/contest",
  method: "get",
  tags,
  summary: "Contest Lists",
  description: "Get a list of all contest",
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ContestSelectSchemaWithAwardsandImages),
      "The contest lists",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
  },
});

export const create = createRoute({
  path: "/contest",
  method: "post",
  summary: "Contest Create",
  request: {
    body: jsonContentRequired(ContestInsertSchemaWithAwards, "The Contest to create"),
  },
  tags,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(ContestSelectSchemaWithAwards, "The created contest"),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ContestInsertSchema),
      "The validation error(s)",
    ),
  },
});

export const getOne = createRoute({
  path: "/contest/{id}",
  method: "get",
  tags,
  summary: "Get Contest",
  description: "Get a specific contest by ID",
  request: {
    params: z.object({
      id: z.string().describe("The contest ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(ContestSelectSchemaWithAwardsandImages, "The contest"),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export const patch = createRoute({
  path: "/contest/{id}",
  method: "patch",
  tags,
  summary: "Update Contest",
  description: "Update a specific contest by ID",
  request: {
    params: z.object({
      id: z.string().describe("The contest ID"),
    }),
    body: jsonContentRequired(ContestInsertSchema.partial(), "The contest data to update"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(ContestSelectSchema, "The updated contest"),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ContestInsertSchema.partial()),
      "The validation error(s)",
    ),
  },
});

export const remove = createRoute({
  path: "/contest/{id}",
  method: "delete",
  tags,
  summary: "Delete Contest",
  description: "Delete a specific contest by ID",
  request: {
    params: z.object({
      id: z.string().describe("The contest ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "Contest deleted successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export const getUpcomingContests = createRoute({
  path: "/contest/upcoming",
  method: "get",
  tags,
  summary: "Get Upcoming Contests",
  description: "Get all upcoming contests",
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ContestSelectSchemaWithAwards),
      "The upcoming contests list",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
  },
});

export const getAvailableContests = createRoute({
  path: "/contest/{userId}/available",
  method: "get",
  tags,
  summary: "Get Available Contests",
  description: "Get contests that the user hasn't joined and are available",
  request: {
    query: PaginationQuerySchema,
    params: z.object({
      userId: z.string().describe("The User ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ContestSelectSchemaWithAwards),
      "The available contests list",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const getJoinedContests = createRoute({
  path: "/contest/{userId}/joined",
  method: "get",
  tags,
  summary: "Get Joined Contests",
  description: "Get contests that the user has joined",
  request: {
    query: PaginationQuerySchema,
    params: z.object({
      userId: z.string().describe("The User ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ContestSelectSchemaWithAwards),
      "The joined contests list",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const getContestStats = createRoute({
  path: "/contest/{id}/stats",
  method: "get",
  tags,
  summary: "Get Contest Stats",
  description: "Get statistics for a specific contest",
  request: {
    params: z.object({
      id: z.string().describe("The contest ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        contestId: z.string(),
        contestName: z.string(),
        totalParticipants: z.number(),
        totalVotes: z.number(),
        freeVotes: z.number(),
        paidVotes: z.number(),
        totalPrizePool: z.number(),
        startDate: z.string(),
        endDate: z.string(),
        isActive: z.boolean(),
        daysRemaining: z.number().optional(),
        participationRate: z.number(),
      }),
      "The contest statistics",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Contest not found"),
  },
});

export const getContestLeaderboard = createRoute({
  path: "/contest/{id}/leaderboard",
  method: "get",
  tags,
  summary: "Get Contest Leaderboard",
  description: "Get leaderboard for a specific contest",
  request: {
    query: PaginationQuerySchema,
    params: z.object({
      id: z.string().describe("The contest ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(
        z.object({
          rank: z.number(),
          profileId: z.string(),
          userId: z.string(),
          username: z.string(),
          displayUsername: z.string().nullable(),
          avatarUrl: z.string().nullable(),
          bio: z.string().nullable(),
          totalVotes: z.number(),
          freeVotes: z.number(),
          paidVotes: z.number(),
          isParticipating: z.boolean(),
          coverImage: z.string().nullable(),
          isApproved: z.boolean(),
        }),
      ),
      "The contest leaderboard",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Contest not found"),
  },
});

export const uploadContestImages = createRoute({
  path: "/contest/{id}/upload/images",
  method: "post",
  tags,
  summary: "Upload Contest Images",
  description: "Upload multiple images for a specific contest",
  request: {
    params: z.object({
      id: z.string().describe("The contest ID"),
    }),
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            files: z.array(z.instanceof(File)).describe("The contest image files to upload"),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ContestSelectSchemaWithAwards,
      "The updated contest with new images",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Contest not found"),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Upload failed"),
  },
});

export const removeContestImage = createRoute({
  path: "/contest/{id}/images/{imageId}",
  method: "delete",
  tags,
  summary: "Remove Contest Image",
  description: "Remove a specific image from a contest",
  request: {
    params: z.object({
      id: z.string().describe("The contest ID"),
      imageId: z.string().describe("The image ID to remove"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "Image removed successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Contest or image not found"),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Failed to remove image"),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetUpcomingContestsRoute = typeof getUpcomingContests;
export type GetAvailableContestsRoute = typeof getAvailableContests;
export type GetJoinedContestsRoute = typeof getJoinedContests;
export type GetContestStatsRoute = typeof getContestStats;
export type GetContestLeaderboardRoute = typeof getContestLeaderboard;
export type UploadContestImagesRoute = typeof uploadContestImages;
export type RemoveContestImageRoute = typeof removeContestImage;
