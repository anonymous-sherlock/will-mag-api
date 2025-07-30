import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';

const tags = ['Vote'];

export const isFreeVoteAvailable = createRoute({
  path: '/votes/is-free-vote-available',
  method: 'post',
  summary: 'Check free vote status',
  description:
    'Returns whether a free vote is available for the given profileId, and if not, when it will be available.',
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        profileId: z.string().describe('The profile ID to check free vote availability for'),
      }),
      'The profile ID to check free vote availability for'
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        available: z.boolean(),
        nextAvailableAt: z.date().optional(),
      }),
      'Whether a free vote is available and the next available time if not.'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      z.object({ error: z.string() }),
      'Missing or invalid profileId.'
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Profile not found.'),
  },
});

export type IsFreeVoteAvailable = typeof isFreeVoteAvailable;
