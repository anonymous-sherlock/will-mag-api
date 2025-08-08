import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { FREE_VOTE_INTERVAL } from "@/constants";
import { db } from "@/db";
import env from "@/env";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";
import { stripe } from "@/lib/stripe";

import type { FreeVote, GetLatestVotes, GetVotesByUserId, IsFreeVoteAvailable, PayVote } from "./vote.routes";

import { updateLastFreeVote, validateFreeVote } from "./vote.action";

export const freeVote: AppRouteHandler<FreeVote> = async (c) => {
  const data = c.req.valid("json");

  if (!(await validateFreeVote(data.voterId))) {
    return sendErrorResponse(
      c,
      "tooManyRequests",
      "You can only use a free vote once every 24 hours for this contest",
    );
  }

  const vote = await db.vote.create({ data });

  await updateLastFreeVote(data.voterId);

  return c.json(vote, HttpStatusCodes.OK);
};

export const isFreeVoteAvailable: AppRouteHandler<IsFreeVoteAvailable> = async (c) => {
  const { profileId } = c.req.valid("json");

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { lastFreeVoteAt: true },
  });
  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found.");
  }
  if (!profile.lastFreeVoteAt) {
    return c.json({ available: true }, HttpStatusCodes.OK);
  }
  const now = new Date();
  const last = new Date(profile.lastFreeVoteAt);
  const diff = now.getTime() - last.getTime();
  if (diff >= FREE_VOTE_INTERVAL) {
    return c.json({ available: true }, HttpStatusCodes.OK);
  }
  const nextAvailableAt = new Date(last.getTime() + FREE_VOTE_INTERVAL);
  return c.json({ available: false, nextAvailableAt }, HttpStatusCodes.OK);
};

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
            description: `${voteCount} votes for ${votee.user.name}`,
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

export const getLatestVotes: AppRouteHandler<GetLatestVotes> = async (c) => {
  const votes = await db.vote.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      votee: {
        select: {
          user: {
            select: {
              name: true,
              id: true,
            },
          },
        },
      },
      createdAt: true,
    },
  });

  const formattedVotes = votes.map((vote) => {
    return {
      name: vote.votee.user.name,
      profileId: vote.votee.user.id,
      createdAt: vote.createdAt.toISOString(),
    };
  });

  return c.json(formattedVotes, HttpStatusCodes.OK);
};

export const getVotesByUserId: AppRouteHandler<GetVotesByUserId> = async (c) => {
  const { userId } = c.req.valid("param");
  const { page, limit } = c.req.valid("query");

  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile with the user id not found");
  }

  const skip = (page - 1) * limit;
  const take = limit;

  const [votes, total] = await Promise.all([
    db.vote.findMany({
      where: { voteeId: profile.id },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        voter: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        contest: {
          select: {
            name: true,
          },
        },
      },
    }),
    db.vote.count({
      where: { voteeId: profile.id },
    }),
  ]);

  const formattedVotesReceived = votes.map(vote => ({
    userId: vote.voter.user.id,
    userName: vote.voter.user.name,
    contestName: vote.contest.name,
    votedOn: vote.createdAt.toISOString(),
  }));

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: formattedVotesReceived, pagination }, HttpStatusCodes.OK);
};
