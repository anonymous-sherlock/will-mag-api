import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { ContestParticipationInsertSchema, ContestParticipationSelectSchema } from "@/db/schema/contest-participation.schema";
import { NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";

const tags = ["ContestParticipation"];

export const join = createRoute({
  path: "/contest/join",
  method: "post",
  summary: "Join Contest",
  description: "Join a user (profile) to a contest.",
  tags,
  request: {
    body: jsonContentRequired(
      ContestParticipationInsertSchema,
      "The join contest payload (profileId, contestId, ...)",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ContestParticipationSelectSchema,
      "The created contest participation record",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ContestParticipationInsertSchema),
      "The validation error(s)",
    ),
  },
});

export const leave = createRoute({
  path: "/contest/leave",
  method: "delete",
  summary: "Leave Contest",
  description: "Leave a contest by removing the participation record.",
  tags,
  request: {
    body: jsonContentRequired(
      ContestParticipationInsertSchema,
      "The leave contest payload (profileId, contestId)",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ContestParticipationSelectSchema,
      "The deleted contest participation record",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Contest participation not found"),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ContestParticipationInsertSchema),
      "The validation error(s)",
    ),
  },
});

export type JoinRoute = typeof join;
export type LeaveRoute = typeof leave;
