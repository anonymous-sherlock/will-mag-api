import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { z } from "zod";

import { PaymentHistorySchema } from "@/db/schema/payments.schema";
import { ForbiddenResponse, NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Payments"];

export const getPaymentHistory = createRoute({
  path: "/payments/{profileId}/history",
  method: "get",
  tags,
  summary: "Get user payment history",
  description: "Retrieve paginated payment history for a specific user",
  request: {
    params: z.object({
      profileId: z.string().openapi({ description: "User ID to get payment history for" }),
    }),
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(PaymentHistorySchema),
      "Payment history retrieved successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.FORBIDDEN]: ForbiddenResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse(),
  },
});

export const getAllPayments = createRoute({
  path: "/payments",
  method: "get",
  tags,
  summary: "Get all payments (Admin only)",
  description: "Retrieve paginated list of all payments in the system",
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(PaymentHistorySchema),
      "All payments retrieved successfully",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.FORBIDDEN]: ForbiddenResponse(),
  },
});

export type GetPaymentHistory = typeof getPaymentHistory;
export type GetAllPayments = typeof getAllPayments;
