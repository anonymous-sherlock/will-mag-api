import * as HttpStatus from "stoker/http-status-codes";
import * as Phrases from "stoker/http-status-phrases";

import { createErrorResponse } from "@/helpers/error-response";

export const UnauthorizedResponse = createErrorResponse({
  defaultMessage: "Authentication required",
  status: HttpStatus.UNAUTHORIZED,
  statusText: Phrases.UNAUTHORIZED,
});

export const ForbiddenResponse = createErrorResponse({
  defaultMessage: "Insufficient permissions",
  status: HttpStatus.FORBIDDEN,
  statusText: Phrases.FORBIDDEN,
});

export const NotFoundResponse = createErrorResponse({
  defaultMessage: "Resource not found",
  status: HttpStatus.NOT_FOUND,
  statusText: Phrases.NOT_FOUND,
});

export const ConflictResponse = createErrorResponse({
  defaultMessage: "Resource already exists",
  status: HttpStatus.CONFLICT,
  statusText: Phrases.CONFLICT,
});

export const BadRequestResponse = createErrorResponse({
  defaultMessage: "Invalid request",
  status: HttpStatus.BAD_REQUEST,
  statusText: Phrases.BAD_REQUEST,
});

export const ServiceUnavailableResponse = createErrorResponse({
  defaultMessage: "Service Unavailable",
  status: HttpStatus.SERVICE_UNAVAILABLE,
  statusText: Phrases.SERVICE_UNAVAILABLE,
});

export const TooManyRequestResponse = createErrorResponse({
  defaultMessage: "Too many request",
  status: HttpStatus.TOO_MANY_REQUESTS,
  statusText: Phrases.TOO_MANY_REQUESTS,
});

export const InternalServerErrorResponse = createErrorResponse({
  defaultMessage: "Interal Server Error",
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  statusText: Phrases.INTERNAL_SERVER_ERROR,
});
