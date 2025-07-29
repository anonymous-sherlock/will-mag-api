import type { Session, User } from "better-auth";

import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Auth"];

export const list = createRoute({
  path: "/auth",
  method: "get",
  tags,
  summary: "Auth user",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        userId: z.string(),
      }),
      "The user list",
    ),

  },
});

export const session = createRoute({
  path: "/auth/session",
  method: "get",
  tags,
  summary: "Authenticated User Session",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        session: z.custom<Session>(),
        users: z.custom<User>(),
      }),
      "User Session",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "Unauthorized",
    ),
  },
});
export type ListRoute = typeof list;
export type SessionRoute = typeof session;
