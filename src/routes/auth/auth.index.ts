import { auth } from "@/lib/auth";
import { createBaseAPIRouter } from "@/lib/create-app";

const router = createBaseAPIRouter()
  .get("/auth/doc", async (c) => {
    const openAPISchema = await auth.api.generateOpenAPISchema();
    const postRequest = openAPISchema.paths["/sign-up/email"]?.post;
    const reqBody = postRequest?.requestBody?.content["application/json"]?.schema;

    if (reqBody && reqBody.properties) {
      // Add username property if it doesn't exist
      if (!reqBody.properties.username) {
        reqBody.properties.username = {
          type: "string",
          minLength: 3,
          maxLength: 100,
          description: "Username is required",
        };
      }

      if (!reqBody.properties.type) {
        reqBody.properties.type = {
          type: "string",
          enum: ["MODEL", "VOTER"],
          description: "User type is required",
        };
      }

      // Ensure username is required
      if (!Array.isArray(reqBody.required)) {
        reqBody.required = [];
      }
      if (!reqBody.required.includes("username")) {
        reqBody.required.push("username");
      }
    }
    return c.json(openAPISchema);
  })
  .on(["POST", "GET", "PUT", "PATCH", "OPTIONS"], "/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

export default router;
