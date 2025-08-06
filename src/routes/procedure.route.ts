import type { RouteConfig } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";

import type { AppRouteHandler } from "@/types/types";

import { sendErrorResponse } from "@/helpers/send-error-response";
import { auth } from "@/lib/auth";
import { createBaseAPIRouter } from "@/lib/create-app";

export type AuthLevel = "public" | "private" | "admin";

// Middleware: Require user to be authenticated
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return sendErrorResponse(c, "unauthorized", "Authentication required");
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
};

// Middleware: Require user to be admin
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const user = c.get("user");

  if (!user || user.role !== "ADMIN") {
    return sendErrorResponse(c, "forbidden", "Admin access required");
  }

  return next();
};

export function defineRoute<R extends RouteConfig>(
  entry: { route: R; handler: AppRouteHandler<R>; auth: "public" | "private" | "admin" },
) {
  return entry;
}

export class RouteBuilder {
  private router = createBaseAPIRouter();

  // Implementation
  openapi<R extends RouteConfig>(
    route: R,
    handler: AppRouteHandler<R>,
    authOrOptions?: AuthLevel | { auth?: AuthLevel; middlewares?: MiddlewareHandler[] },
    ...middlewares: MiddlewareHandler[]
  ) {
    // Determine auth level and middlewares based on parameter type
    let auth: AuthLevel = "public";
    let finalMiddlewares: MiddlewareHandler[] = [];

    if (typeof authOrOptions === "string") {
      // Overload 2: auth is a string, middlewares are rest parameters
      auth = authOrOptions;
      finalMiddlewares = middlewares;
    }
    else if (typeof authOrOptions === "object" && authOrOptions !== null) {
      // Overload 3: options object
      auth = authOrOptions.auth || "public";
      finalMiddlewares = authOrOptions.middlewares || [];
    }
    // Overload 1: authOrOptions is undefined, use defaults

    if (finalMiddlewares.length) {
      switch (auth) {
        case "public":
          this.router.use(route.getRoutingPath(), ...finalMiddlewares);
          break;
        case "private":
          this.router.use(route.getRoutingPath(), requireAuth, ...finalMiddlewares);
          break;
        case "admin":
          this.router.use(route.getRoutingPath(), requireAuth, requireAdmin, ...finalMiddlewares);
          break;
        default:
          this.router.use(route.getRoutingPath(), ...finalMiddlewares);
          break;
      }
    }
    this.router.openapi(route, handler);
    return this;
  }

  getRouter() {
    return this.router;
  }
}
