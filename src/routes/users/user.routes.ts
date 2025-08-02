import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { ProfileSelectSchema } from "@/db/schema/profile.schema";
import { UserInsertSchema, UserSelectSchema } from "@/db/schema/users.schema";
import { ForbiddenResponse, NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Users"];

export const list = createRoute({
  path: "/users",
  method: "get",
  tags,
  summary: "User Lists",
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(UserSelectSchema),
      "The user list",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
  },
});

export const create = createRoute({
  path: "/users",
  method: "post",
  summary: "User Create",
  request: {
    body: jsonContentRequired(
      UserInsertSchema,
      "The User to create",
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      UserSelectSchema,
      "The created user",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("User not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(UserInsertSchema),
      "The validation error(s)",
    ),
  },
});

export const getOne = createRoute({
  path: "/users/{id}",
  method: "get",
  tags,
  summary: "Get User",
  description: "Get a specific user by ID",
  request: {
    params: z.object({
      id: z.string().describe("The user ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      UserSelectSchema,
      "The user",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("User not found"),
  },
});

export const patch = createRoute({
  path: "/users/{id}",
  method: "patch",
  tags,
  summary: "Update User",
  description: "Update a specific user by ID",
  request: {
    params: z.object({
      id: z.string().describe("The user ID"),
    }),
    body: jsonContentRequired(
      UserInsertSchema.partial(),
      "The user data to update",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      UserSelectSchema,
      "The updated user",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.FORBIDDEN]: ForbiddenResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("User not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(UserInsertSchema.partial()),
      "The validation error(s)",
    ),
  },
});

export const remove = createRoute({
  path: "/users/{id}",
  method: "delete",
  tags,
  summary: "Delete User",
  description: "Delete a specific user by ID",
  request: {
    params: z.object({
      id: z.string().describe("The user ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "User deleted successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.FORBIDDEN]: ForbiddenResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("User not found"),
  },
});

export const getUserProfile = createRoute({
  path: "/users/{id}/profile",
  method: "get",
  tags,
  summary: "Get User Profile",
  description: "Get a specific user's profile by user ID",
  security: [
    {
      BearerAuth: [],
    },
  ],
  request: {
    params: z.object({
      id: z.string().describe("The user ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ProfileSelectSchema,
      "The user's profile",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("User not found"),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetUserProfileRoute = typeof getUserProfile;
