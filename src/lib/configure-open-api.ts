import { Scalar } from "@scalar/hono-api-reference";

import type { AppOpenAPI } from "../types/types";

import packageJSON from "../../package.json" with { type: "json" };

export default function configureOpenAPI(app: AppOpenAPI) {
  app.openAPIRegistry.registerComponent("securitySchemes", "Bearer Auth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "bearer",
    description: "Include this token in the 'Authorization' header",
  });
  app.doc("api/v1/doc", {
    openapi: "3.0.0",
    info: {
      version: packageJSON.version,
      title: "Swing Magazine API",
    },
    security: [{ "Bearer Auth": [] }],
  });

  app.get(
    "/reference",
    Scalar({
      url: "api/v1/doc",
      theme: "elysiajs",
      layout: "modern",
      defaultHttpClient: {
        targetKey: "js",
        clientKey: "axios",
      },
      sources: [
        { url: "/api/v1/doc", title: "Swing Mag API" },
        { url: "/api/v1/auth/doc", title: "Authentication" },
      ],
    }),
  );
}
