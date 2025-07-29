import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { ContestInsertSchema, ContestSelectSchema } from "@/db/schema/contest.schema";

const tags = ["Contest"];

export const list = createRoute({
  path: "/contest",
  method: "get",
  tags,
  summary: "Contest Lists",
  description: "Get a list of all contest",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(ContestSelectSchema),
      "The contest lists",
    ),
  },
});

export const create = createRoute({
  path: "/contest",
  method: "post",
  summary: "Contest Create",
  request: {
    body: jsonContentRequired(
      ContestInsertSchema,
      "The Contest to create",
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ContestSelectSchema,
      "The created contest",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ContestInsertSchema),
      "The validation error(s)",
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
