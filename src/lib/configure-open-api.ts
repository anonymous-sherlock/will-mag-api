import { Scalar } from "@scalar/hono-api-reference";

import type { AppOpenAPI } from "./types";

import packageJSON from "../../package.json" with { type: "json" };

export default function configureOpenAPI(app: AppOpenAPI) {
  app.doc("api/v1/doc", {
    openapi: "3.0.0",
    info: {
      version: packageJSON.version,
      title: "Will Magazine API",
    },
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
    }),
  );
}
