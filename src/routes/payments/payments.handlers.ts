import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db/index";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { GetAllPayments, GetPaymentHistory } from "./payments.routes";

export const getPaymentHistory: AppRouteHandler<GetPaymentHistory> = async (c) => {
  const { page, limit } = c.req.valid("query");
  const { userId } = c.req.valid("param");

  const session = c.get("session");
  if (!session) {
    return sendErrorResponse(c, "unauthorized", "User not authenticated");
  }

  // Check if the authenticated user is requesting their own payment history
  // or if they have admin privileges
  if (session.userId !== userId && session.role !== "ADMIN") {
    return sendErrorResponse(c, "forbidden", "You can only view your own payment history");
  }

  // Find the user's profile
  const profile = await db.profile.findFirst({
    where: { userId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Get paginated payment history for the user
  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where: {
        payerId: profile.id,
      },
      include: {
        payer: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        votes: {
          include: {
            contest: {
              select: {
                id: true,
                name: true,
              },
            },
            votee: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.payment.count({
      where: {
        payerId: profile.id,
      },
    }),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: payments,
    pagination,
  }, HttpStatusCodes.OK);
};

export const getAllPayments: AppRouteHandler<GetAllPayments> = async (c) => {
  const { page, limit } = c.req.valid("query");

  // Get the authenticated user from the session
  const session = c.get("session");
  if (!session) {
    return sendErrorResponse(c, "unauthorized", "User not authenticated");
  }

  // Check if the user has admin privileges
  if (session.role !== "ADMIN") {
    return sendErrorResponse(c, "forbidden", "Admin access required");
  }

  // Get paginated list of all payments
  const [payments, total] = await Promise.all([
    db.payment.findMany({
      include: {
        payer: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        votes: {
          include: {
            contest: {
              select: {
                id: true,
                name: true,
              },
            },
            votee: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.payment.count(),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: payments,
    pagination,
  }, HttpStatusCodes.OK);
};
