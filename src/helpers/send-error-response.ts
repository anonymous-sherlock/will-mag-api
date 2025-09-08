/* eslint-disable ts/consistent-type-definitions */
import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import type { JSONValue } from "hono/utils/types";

import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

// Error types
export type ErrorType = "unauthorized" | "forbidden" | "notFound" | "conflict" | "badRequest" | "serviceUnavailable" | "conflict" | "tooManyRequests" | "internalServerError" | "requestTimeout";

// Presets for common error responses
const errorPresets = {
  unauthorized: {
    status: HttpStatusCodes.UNAUTHORIZED,
    statusText: "Unauthorized",
    message: "Authentication required",
  },
  forbidden: {
    status: HttpStatusCodes.FORBIDDEN,
    statusText: "Forbidden",
    message: "Insufficient permissions",
  },
  notFound: {
    status: HttpStatusCodes.NOT_FOUND,
    statusText: "Not Found",
    message: "Resource not found",
  },
  conflict: {
    status: HttpStatusCodes.CONFLICT,
    statusText: "Conflict",
    message: "Resource already exists",
  },
  badRequest: {
    status: HttpStatusCodes.BAD_REQUEST,
    statusText: "Bad Request",
    message: "Invalid request",
  },
  serviceUnavailable: {
    status: HttpStatusCodes.SERVICE_UNAVAILABLE,
    statusText: "Service unavailable",
    message: "",
  },
  tooManyRequests: {
    status: HttpStatusCodes.TOO_MANY_REQUESTS,
    statusText: "Too many requests",
    message: "Too many requests",
  },
  internalServerError: {
    status: HttpStatusCodes.INTERNAL_SERVER_ERROR,
    statusText: HttpStatusPhrases.INTERNAL_SERVER_ERROR,
    message: "Internal Server Error",
  },
  requestTimeout: {
    status: HttpStatusCodes.REQUEST_TIMEOUT,
    statusText: "Request Timeout",
    message: "Request Timeout",
  },

} as const satisfies Record<ErrorType, { status: StatusCode; statusText: string; message: string }>;

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
