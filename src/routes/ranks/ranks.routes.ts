import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';
import { RankSchema } from '@/db/schema/rank.schema';

const tags = ['Ranks'];

export const list = createRoute({
  path: '/ranks',
  method: 'get',
  tags,
  summary: 'Rank List',
  decscription: '',
  request: {
    query: z.object({
      limit: z.coerce.number().optional().default(2),
      page: z.coerce.number().optional().default(1),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.array(RankSchema), 'The rank list'),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(
        z.object({
          limit: z.string().optional().describe('Invalid limit parameter'),
          page: z.string().optional().describe('Invalid page parameter'),
        })
      ),
      'The validation error(s)'
    ),
  },
});

export type ListRoute = typeof list;
