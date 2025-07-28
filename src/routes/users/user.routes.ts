import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { UserInsertSchema, UserSelectSchema } from "@/db/schema/users.schema";

const tags = ["Users"];

export const list = createRoute({
  path: "/users",
  method: "get",
  tags,
  summary: "User Lists",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(UserSelectSchema),
      "The user list",
    ),
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
    [HttpStatusCodes.OK]: jsonContent(
      UserSelectSchema,
      "The created user",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(UserInsertSchema),
      "The validation error(s)",
    ),
  },
});
export type ListRoute = typeof list;
export type CreateRoute = typeof create;
