import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Images"];

export const transformImage = createRoute({
  tags,
  method: "get",
  path: "/images/transform",
  summary: "Transform image on the fly",
  description: "Transform images with various parameters like resize, quality, format, filters, etc.",
  request: {
    query: z.object({
      url: z.string().url("Invalid image URL"),
      w: z.string().optional().transform(val => val ? Number.parseInt(val, 10) : undefined),
      h: z.string().optional().transform(val => val ? Number.parseInt(val, 10) : undefined),
      q: z.string().optional().transform(val => val ? Number.parseInt(val, 10) : undefined),
      f: z.enum(["jpeg", "png", "webp", "avif"]).optional(),
      fit: z.enum(["cover", "contain", "fill", "inside", "outside"]).optional(),
      position: z.enum(["top", "right top", "right", "right bottom", "bottom", "left bottom", "left", "left top", "center"]).optional(),
      bg: z.string().optional(),
      blur: z.string().optional().transform(val => val ? Number.parseFloat(val) : undefined),
      sharpen: z.string().optional().transform(val => val ? Number.parseFloat(val) : undefined),
      grayscale: z.enum(["true", "false"]).optional().default("false").transform(val => val === "true"),
      negate: z.string().optional().transform(val => val === "true"),
      normalize: z.string().optional().transform(val => val === "true"),
      threshold: z.string().optional().transform(val => val ? Number.parseInt(val, 10) : undefined),
      gamma: z.string().optional().transform(val => val ? Number.parseFloat(val) : undefined),
      brightness: z.string().optional().transform(val => val ? Number.parseFloat(val) : undefined),
      saturation: z.string().optional().transform(val => val ? Number.parseFloat(val) : undefined),
      hue: z.string().optional().transform(val => val ? Number.parseInt(val, 10) : undefined),
      rotate: z.string().optional().transform(val => val ? Number.parseInt(val, 10) : undefined),
      flip: z.string().optional().transform(val => val === "true"),
      flop: z.string().optional().transform(val => val === "true"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "image/*": {
          schema: z.string(),
        },
      },
      description: "Transformed image",
    },
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
        code: z.string().optional(),
      }),
      "Bad request - invalid parameters",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
        code: z.string().optional(),
      }),
      "Image not found",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
        code: z.string().optional(),
      }),
      "Internal server error",
    ),
  },
});

export const healthCheck = createRoute({
  tags,
  method: "get",
  path: "/images/health",
  summary: "Health check for image transformation service",
  description: "Check if the image transformation service is working properly",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.string(),
        service: z.string(),
        cache: z.object({
          size: z.number(),
          ttl: z.number(),
        }),
        performance: z.object({
          totalRequests: z.number(),
          cacheHits: z.number(),
          cacheMisses: z.number(),
          cacheHitRate: z.string(),
          averageProcessingTime: z.string(),
          testProcessingTime: z.string(),
        }),
      }),
      "Service is healthy",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({
        status: z.string(),
        service: z.string(),
        error: z.string(),
      }),
      "Service is unhealthy",
    ),
  },
});

export type TransformImageRoute = typeof transformImage;
export type HealthCheckRoute = typeof healthCheck;
