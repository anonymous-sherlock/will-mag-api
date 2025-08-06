import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { Schema } from "hono";
import type { PinoLogger } from "hono-pino";

import type { auth } from "@/lib/auth";

export interface AppBindings {
  Variables: {
    logger: PinoLogger;
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

export interface ProtectedAppBindings extends AppBindings {
  Variables: {
    logger: PinoLogger;
    user: typeof auth.$Infer.Session.user;
    session: typeof auth.$Infer.Session.session;
  };
}

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;
export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;

// eslint-disable-next-line ts/no-empty-object-type
export type ProtectedAppOpenAPI<S extends Schema = {}> = OpenAPIHono<ProtectedAppBindings, S>;
export type ProtectedAppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;

type RouteHandlerTuple<R extends RouteConfig = RouteConfig> = [R, AppRouteHandler<R>];

export interface RouteGroups {
  public?: RouteHandlerTuple[];
  private?: RouteHandlerTuple[];
  admin?: RouteHandlerTuple[];
}
