import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { LeaderboardSelectSchema, LeaderboardStatsSchema } from '@/db/schema/leaderboard.schema';
import { createPaginatedResponseSchema, PaginationQuerySchema } from '@/lib/queries/query.schema';

const tags = ['Leaderboard'];

// Override the default limit to 50 for leaderboard

export const getLeaderboard = createRoute({
  path: '/leaderboard',
  method: 'get',
  tags,
  summary: 'Get Leaderboard',
  description: 'Get the leaderboard of model profiles ranked by total votes received',
  request: {
    query: PaginationQuerySchema.extend({
      limit: z.coerce.number().max(100).optional().default(50),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(LeaderboardSelectSchema),
      'The leaderboard data'
    ),
  },
});

export const getLeaderboardStats = createRoute({
  path: '/leaderboard/stats',
  method: 'get',
  tags,
  summary: 'Get Leaderboard Stats',
  description: 'Get the leaderboard stats with total votes received, top performer and many more',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(LeaderboardStatsSchema, 'The leaderboard data'),
  },
});

export type GetLeaderboardRoute = typeof getLeaderboard;
export type GetLeaderboardStatsRoute = typeof getLeaderboardStats;
