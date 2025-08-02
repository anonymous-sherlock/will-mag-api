import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { ContestInsertSchema, ContestSelectSchema } from "@/db/schema/contest.schema";
import { NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Contest"];

export const list = createRoute({
  path: "/contest",
  method: "get",
  tags,
  summary: "Contest Lists",
  description: "Get a list of all contest",
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ContestSelectSchema),
      "The contest lists",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
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
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ContestInsertSchema),
      "The validation error(s)",
    ),
  },
});

export const getOne = createRoute({
  path: "/contest/{id}",
  method: "get",
  tags,
  summary: "Get Contest",
  description: "Get a specific contest by ID",
  request: {
    params: z.object({
      id: z.string().describe("The contest ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ContestSelectSchema,
      "The contest",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export const patch = createRoute({
  path: "/contest/{id}",
  method: "patch",
  tags,
  summary: "Update Contest",
  description: "Update a specific contest by ID",
  request: {
    params: z.object({
      id: z.string().describe("The contest ID"),
    }),
    body: jsonContentRequired(
      ContestInsertSchema.partial(),
      "The contest data to update",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ContestSelectSchema,
      "The updated contest",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ContestInsertSchema.partial()),
      "The validation error(s)",
    ),
  },
});

export const remove = createRoute({
  path: "/contest/{id}",
  method: "delete",
  tags,
  summary: "Delete Contest",
  description: "Delete a specific contest by ID",
  request: {
    params: z.object({
      id: z.string().describe("The contest ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "Contest deleted successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
