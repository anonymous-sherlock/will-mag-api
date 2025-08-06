import type { Schema } from "hono";

import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";

import { pinoLogger } from "@/middlewares/pino-logger";

import type { AppBindings, AppOpenAPI } from "../types/types";

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}
export function createBaseAPIRouter() {
  const app = createRouter().basePath("api/v1");
  app.openAPIRegistry.registerComponent("securitySchemes", "Bearer Auth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "bearer",
    description: "Include this token in the 'Authorization' header",
  });
  return app;
}

export default function createApp() {
  const app = createRouter();
  app
    .use(cors({
      origin: ["http://localhost:3001", "http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "https://app.swingboudoirmag.com"],
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "PATCH", "PUT", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    }))
    .use(requestId())
    .use(serveEmojiFavicon("📝"))
    .use(pinoLogger());

  app.notFound(notFound);
  app.onError(onError);
  return app;
}

export function createTestApp<S extends Schema>(router: AppOpenAPI<S>) {
  return createApp().route("/", router);
}
