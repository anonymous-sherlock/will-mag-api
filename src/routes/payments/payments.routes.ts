import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { z } from "zod";

import { PayVoteRequestSchema, PayVoteResponseSchema } from "@/db/schema/payments.schema";

const tags = ["Vote"];

export const payVote = createRoute({
  path: "/vote/pay",
  method: "post",
  tags,
  summary: "API to pay for votes",
  description: "",
  request: {
    body: jsonContentRequired(PayVoteRequestSchema, "The validation error"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(PayVoteResponseSchema, "Payment made successfully"),
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: jsonContent(z.string(), "Error"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.string(), "Data not found"),
  },
});

export type PayVote = typeof payVote;
