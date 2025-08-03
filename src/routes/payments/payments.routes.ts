import { PayVoteRequestSchema, PayVoteResponseSchema } from '@/db/schema/payments.schema';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { createRoute } from '@hono/zod-openapi';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { z } from 'zod';

const tags = ['Vote'];

export const payVote = createRoute({
  path: '/vote/pay',
  method: 'post',
  tags: tags,
  summary: 'API to pay for votes',
  description: '',
  request: {
    body: jsonContentRequired(PayVoteRequestSchema, 'The validation error'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(PayVoteResponseSchema, 'Payment made successfully'),
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: jsonContent(z.string(), 'Error'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.string(), 'Data not found'),
  },
});

export type PayVote = typeof payVote;
