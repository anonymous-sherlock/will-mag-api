import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { ProfileInsertSchema, ProfileSelectSchema } from "@/db/schema/profile.schema";
import { NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Profile"];

export const list = createRoute({
  path: "/profile",
  method: "get",
  tags,
  summary: "Profile Lists",
  description: "Get a list of all profiles",
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(ProfileSelectSchema),
      "The profile lists",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
  },
});

export const create = createRoute({
  path: "/profile",
  method: "post",
  summary: "Profile Create",
  request: {
    body: jsonContentRequired(
      ProfileInsertSchema,
      "The Profile to create",
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      ProfileSelectSchema,
      "The created profile",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ProfileInsertSchema),
      "The validation error(s)",
    ),
  },
});

export const getOne = createRoute({
  path: "/profile/{id}",
  method: "get",
  tags,
  summary: "Get Profile",
  description: "Get a specific profile by ID",
  request: {
    params: z.object({
      id: z.string().describe("The profile ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ProfileSelectSchema,
      "The profile",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const patch = createRoute({
  path: "/profile/{id}",
  method: "patch",
  tags,
  summary: "Update Profile",
  description: "Update a specific profile by ID",
  request: {
    params: z.object({
      id: z.string().describe("The profile ID"),
    }),
    body: jsonContentRequired(
      ProfileInsertSchema.partial(),
      "The profile data to update",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ProfileSelectSchema,
      "The updated profile",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(ProfileInsertSchema.partial()),
      "The validation error(s)",
    ),
  },
});

export const remove = createRoute({
  path: "/profile/{id}",
  method: "delete",
  tags,
  summary: "Delete Profile",
  description: "Delete a specific profile by ID",
  request: {
    params: z.object({
      id: z.string().describe("The profile ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "Profile deleted successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
