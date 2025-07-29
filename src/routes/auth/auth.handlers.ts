import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { AppRouteHandler } from "@/lib/types";

import type { ListRoute, SessionRoute } from "./auth.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  return c.json({
    message: "You are logged in!",
    userId: "1212",
  });
};

export const session: AppRouteHandler<SessionRoute> = async (c) => {
  const session = c.get("session");
  const user = c.get("user");

  if (!user) {
    return c.json({
      message: HttpStatusPhrases.UNAUTHORIZED,
    }, HttpStatusCodes.UNAUTHORIZED);
  }

  return c.json({
    session,
    user,
  }, HttpStatusCodes.OK);
};
