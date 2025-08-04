/* eslint-disable ts/consistent-type-definitions */
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

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;

// uploadthing
export type UploadFileResponse
  = | { data: UploadData; error: null }
    | { data: null; error: UploadError };

type UploadData = {
  key: string;
  url: string;
  name: string;
  size: number;
};

type UploadError = {
  code: string;
  message: string;
  data: any;
};
