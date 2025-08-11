import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { FREE_VOTE_INTERVAL } from "@/constants";
import { db } from "@/db";
import env from "@/env";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";
import { stripe } from "@/lib/stripe";
import { getActiveVoteMultiplier } from "@/lib/vote-multiplier";

import type {
  FreeVote,
  GetLatestVotes,
  GetVotesByProfileId,
  IsFreeVoteAvailable,
  PayVote,
} from "./vote.routes";

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
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    }),
    db.profile.findUnique({
      where: { id: voteeId },
      include: {
        coverImage: {
          select: {
            url: true,
          },
        },
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
      amount: voteCount,
      status: "PENDING",
      payerId: voter.id,
      stripeSessionId: "",
    },
  });
  const activeMultiplier = await getActiveVoteMultiplier();

  const session = await stripe.checkout.sessions.create({
    metadata: {
      paymentId: payment.id,
      voteeId: votee.id,
      contestId: contest.id,
      voterId: voter.id,
      voteCount,
      votesMultipleBy: activeMultiplier,
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: 100,
          product_data: {
            name: activeMultiplier > 1 ? `Votes Boost Pack` : "Back Your Favorite",
            ...(votee.coverImage?.url ? { images: [votee.coverImage?.url] } : null),
            description:
              activeMultiplier > 1
                ? `${voteCount} votes boosted by ${activeMultiplier}x = ${voteCount * activeMultiplier} votes for ${votee.user.name}`
                : `${voteCount} votes for ${votee.user.name}`,
          },
        },
        quantity: voteCount,
      },
    ],
    mode: "payment",
    currency: "usd",
    customer_email: voter.user.email,
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

  console.log(session.url);

  return c.json(formattedStripeSession, HttpStatusCodes.OK);
};

export const getLatestVotes: AppRouteHandler<GetLatestVotes> = async (c) => {
  const { page, limit } = c.req.valid("query");

  const [votes, totalVotes] = await Promise.all([
    await db.vote.findMany({
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
                image: true,
                profile: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        voter: {
          select: {
            user: {
              select: {
                name: true,
                id: true,
                image: true,
                profile: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        count: true,
        createdAt: true,
      },
    }),
    await db.vote.count(),
  ]);

  const formattedVotes = votes.map(vote => [
    {
      votee: vote.votee?.user
        ? {
            name: vote.votee.user.name,
            id: vote.votee.user.profile?.id ?? "",
            profilePicture: vote.votee.user.image ?? "",
          }
        : null,
      voter: vote.voter?.user
        ? {
            name: vote.voter.user.name,
            id: vote.voter.user.profile?.id ?? "",
            profilePicture: vote.voter.user.image ?? "",
          }
        : null,
      createdAt: vote.createdAt.toISOString(),
      totalVotes: vote.count,
    },
  ]);

  const pagination = calculatePaginationMetadata(totalVotes, page, limit);

  return c.json({ data: formattedVotes, pagination }, HttpStatusCodes.OK);
};

export const getVotesByProfileId: AppRouteHandler<GetVotesByProfileId> = async (c) => {
  const { profileId } = c.req.valid("param");
  const { page, limit } = c.req.valid("query");

  const profile = await db.profile.findUnique({
    where: { id: profileId },
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
                name: true,
                profile: {
                  select: {
                    id: true,
                  },
                },
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
    profileId: vote.voter.user.profile?.id ?? "",
    userName: vote.voter.user.name,
    contestName: vote.contest.name,
    votedOn: vote.createdAt.toISOString(),
    count: vote.count,
  }));

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: formattedVotesReceived, pagination }, HttpStatusCodes.OK);
};
