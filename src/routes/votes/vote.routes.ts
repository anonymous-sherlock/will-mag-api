import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';
import { z } from 'zod';

import {
  GetLatestVotesResponseSchema,
  GetVotesByUserIdResponseSchema,
  VoteInsertSchema,
  VoteSelectSchema,
} from '@/db/schema/vote.schema';
import { createPaginatedResponseSchema, PaginationQuerySchema } from '@/lib/queries/query.schema';
import { NotFoundResponse } from '@/lib/openapi.responses';

const tags = ['Vote'];

export const vote = createRoute({
  path: '/contest/vote',
  method: 'post',
  summary: 'Vote a profile in a contest',
  description:
    'Vote for a profile in a contest. Supports free and paid votes. Free votes are limited to one per 24 hours per contest.',
  tags,
  request: {
    body: jsonContentRequired(
      VoteInsertSchema,
      'The vote payload (voterId, voteeId, contestId, type)'
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(VoteSelectSchema, 'The created vote record'),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(VoteInsertSchema),
      'The validation error(s)'
    ),
  },
});

export const getLatestVotes = createRoute({
  path: '/votes/latest-votes',
  method: 'get',
  summary: 'Get latest votes',
  description: 'Get a list of latest votes',
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(GetLatestVotesResponseSchema, 'The latest votes'),
  },
});

export const getVotesByUserId = createRoute({
  path: '/votes/{userId}',
  method: 'get',
  tags,
  summary: 'Get votes by user id',
  description: 'Get votes for a user by user id',
  request: {
    params: z.object({
      userId: z.string(),
    }),
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(GetVotesByUserIdResponseSchema),
      'Votes fetched for the user successfully'
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});
