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
