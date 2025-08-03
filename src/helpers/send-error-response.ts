/* eslint-disable ts/consistent-type-definitions */
// src/utils/send-error-response.ts

import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import type { JSONValue } from "hono/utils/types";

// Error types
export type ErrorType = "unauthorized" | "forbidden" | "notFound";

// Presets for common error responses
const errorPresets = {
  unauthorized: {
    status: 401,
    statusText: "Unauthorized",
    message: "Authentication required",
  },
  forbidden: {
    status: 403,
    statusText: "Forbidden",
    message: "Insufficient permissions",
  },
  notFound: {
    status: 404,
    statusText: "Not Found",
    message: "Resource not found",
  },
} as const;

type ErrorPresets = typeof errorPresets;

// Infer response data shape from error type
type ErrorResponse<T extends ErrorType> = {
  status: ErrorPresets[T]["status"];
  statusText: ErrorPresets[T]["statusText"];
  message: string;
};

// Typed JSON response wrapper (like hono’s internal type)
export type TypedResponse<
  T = unknown,
  U extends StatusCode = StatusCode,
  F extends "json" | "text" = T extends string
    ? "text"
    : T extends JSONValue
      ? "json"
      : never,
> = Response & {
  _data: T;
  _status: U;
  _format: F;
};

// Factory function to return typed error response
export function sendErrorResponse<T extends ErrorType>(
  c: Context,
  type: T,
  customMessage?: string,
): TypedResponse<ErrorResponse<T>, ErrorPresets[T]["status"], "json"> {
  const { status, statusText, message } = errorPresets[type];

  return c.json(
    {
      status,
      statusText,
      message: customMessage ?? message,
    },
    status,
  ) as TypedResponse<ErrorResponse<T>, ErrorPresets[T]["status"], "json">;
}
