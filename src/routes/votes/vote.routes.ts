import { createRoute } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import {
  GetLatestVotesResponseSchema,
  VoteInsertSchema,
  VoteSelectSchema,
} from '@/db/schema/vote.schema';

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
