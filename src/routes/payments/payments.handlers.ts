import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db/index";
import env from "@/env";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";
import { stripe } from "@/lib/stripe";

import type { GetAllPayments, GetPaymentHistory, PayVote } from "./payments.routes";

export const payVote: AppRouteHandler<PayVote> = async (c) => {
  const { voteeId, voterId, voteCount, contestId } = c.req.valid("json");

  const [voter, votee, contest] = await Promise.all([
    db.profile.findUnique({
      where: { id: voterId },
    }),
    db.profile.findUnique({
      where: { id: voteeId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    }),
    db.contest.findUnique({
      where: { id: contestId },
    }),
  ]);

  if (!votee) {
    return sendErrorResponse(c, "notFound", "Votee with the shared profile id was not found");
  }

  if (!voter) {
    return sendErrorResponse(c, "notFound", "Voter with the shared profile id was not found");
  }

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest with the shared contest id was not found");
  }

  const isVoteePresent = await db.contestParticipation.findFirst({
    where: {
      contestId,
      profileId: votee.id,
    },
  });

  if (!isVoteePresent) {
    return sendErrorResponse(c, "notFound", "Votee is not a participant in the contest");
  }

  const payment = await db.payment.create({
    data: {
      amount: Number.parseFloat(voteCount),
      status: "PENDING",
      payerId: voter.id,
      stripeSessionId: "",
    },
  });

  const session = await stripe.checkout.sessions.create({
    metadata: {
      paymentId: payment.id,
      voteeId: votee.id,
      contestId: contest.id,
      voterId: voter.id,
      voteCount,
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: 100,
          product_data: {
            name: "Vote Credits",
            description: `${voteCount}votes for ${votee.user.name}`,
          },
        },
        quantity: Number.parseInt(voteCount),
      },
    ],
    mode: "payment",
    success_url: `${env.FRONTEND_URL}/success`,
    cancel_url: `${env.FRONTEND_URL}/cancel`,
  });

  if (!session) {
    return sendErrorResponse(c, "serviceUnavailable", "Session was not created");
  }

  if (!session.url) {
    return sendErrorResponse(c, "notFound", "Session URL was not found");
  }

  const formattedStripeSession = {
    url: session.url,
  };

  console.log(formattedStripeSession);

  return c.json(formattedStripeSession, HttpStatusCodes.OK);
};

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
