import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db/index";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { GetAllPayments, GetPaymentHistory } from "./payments.routes";

export const getPaymentHistory: AppRouteHandler<GetPaymentHistory> = async (c) => {
  const { page, limit } = c.req.valid("query");
  const { profileId } = c.req.valid("param");

  const profile = await db.profile.findFirst({
    where: { id: profileId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where: {
        payerId: profile.id,
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        status: true,
        stripeSessionId: true,
        payer: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        votes: {
          select: {
            count: true,
            id: true,
            type: true,
            contest: {
              select: {
                name: true,
              },
            },
            votee: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            voter: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            createdAt: true,
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

  return c.json(
    {
      data: payments,
      pagination,
    },
    HttpStatusCodes.OK,
  );
};

export const getAllPayments: AppRouteHandler<GetAllPayments> = async (c) => {
  const { page, limit } = c.req.valid("query");

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      select: {
        id: true,
        amount: true,
        createdAt: true,
        status: true,
        stripeSessionId: true,
        payer: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        votes: {
          select: {
            count: true,
            id: true,
            type: true,
            contest: {
              select: {
                name: true,
              },
            },
            votee: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            voter: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            createdAt: true,
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

  return c.json(
    {
      data: payments,
      pagination,
    },
    HttpStatusCodes.OK,
  );
};
