import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import {
  ContestInsertSchema,
  ContestInsertSchemaWithAwards,
  ContestSelectSchema,
  ContestSelectSchemaWithAwards,
} from '@/db/schema/contest.schema';
import { ProfileSelectSchema } from '@/db/schema/profile.schema';
import { NotFoundResponse, UnauthorizedResponse } from '@/lib/openapi.responses';
import { createPaginatedResponseSchema, PaginationQuerySchema } from '@/lib/queries/query.schema';

const tags = ['Contest'];

export const list = createRoute({
  path: '/contest',
  method: 'get',
  tags,
  summary: 'Contest Lists',
  description: 'Get a list of all contest',
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ContestSelectSchemaWithAwards),
      'The contest lists'
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
  },
});

export const create = createRoute({
  path: '/contest',
  method: 'post',
  summary: 'Contest Create',
  request: {
    body: jsonContentRequired(ContestInsertSchemaWithAwards, 'The Contest to create'),
  },
  tags,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(ContestSelectSchemaWithAwards, 'The created contest'),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ContestInsertSchema),
      'The validation error(s)'
    ),
  },
});

export const getOne = createRoute({
  path: '/contest/{id}',
  method: 'get',
  tags,
  summary: 'Get Contest',
  description: 'Get a specific contest by ID',
  request: {
    params: z.object({
      id: z.string().describe('The contest ID'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(ContestSelectSchemaWithAwards, 'The contest'),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export const patch = createRoute({
  path: '/contest/{id}',
  method: 'patch',
  tags,
  summary: 'Update Contest',
  description: 'Update a specific contest by ID',
  request: {
    params: z.object({
      id: z.string().describe('The contest ID'),
    }),
    body: jsonContentRequired(ContestInsertSchema.partial(), 'The contest data to update'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(ContestSelectSchema, 'The updated contest'),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ContestInsertSchema.partial()),
      'The validation error(s)'
    ),
  },
});

export const remove = createRoute({
  path: '/contest/{id}',
  method: 'delete',
  tags,
  summary: 'Delete Contest',
  description: 'Delete a specific contest by ID',
  request: {
    params: z.object({
      id: z.string().describe('The contest ID'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      'Contest deleted successfully'
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export const getUpcomingContests = createRoute({
  path: '/contest/{userId}/upcoming',
  method: 'get',
  tags,
  summary: 'Get Upcoming Contests',
  description: "Get contests that the user hasn't joined and are upcoming",
  request: {
    query: PaginationQuerySchema,
    params: z.object({
      userId: z.string().describe('The User ID'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ContestSelectSchemaWithAwards),
      'The available contests list'
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse('Profile not found'),
  },
});

export const getJoinedContests = createRoute({
  path: '/contest/{userId}/joined',
  method: 'get',
  tags,
  summary: 'Get Joined Contests',
  description: 'Get contests that the user has joined',
  request: {
    query: PaginationQuerySchema,
    params: z.object({
      userId: z.string().describe('The User ID'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ContestSelectSchemaWithAwards),
      'The joined contests list'
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse('Profile not found'),
  },
});

export const getContestWinner = createRoute({
  path: '/contest/{id}/winner',
  method: 'get',
  tags: ['Contest Winner'],
  summary: 'Get Contest Winner',
  description: 'Get the winner of a specific contest',
  request: {
    params: z.object({
      id: z.string().describe('The contest ID'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        contest: ContestSelectSchemaWithAwards,
        winner: ProfileSelectSchema.nullable(),
        totalParticipants: z.number(),
        totalVotes: z.number(),
      }),
      'The contest winner information'
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse('Contest not found'),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetUpcomingContestsRoute = typeof getUpcomingContests;
export type GetJoinedContestsRoute = typeof getJoinedContests;
export type GetContestWinnerRoute = typeof getContestWinner;
