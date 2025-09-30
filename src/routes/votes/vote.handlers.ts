import * as HttpStatusCodes from "stoker/http-status-codes";

import type { Prisma } from "@/generated/prisma";
import type { AppRouteHandler } from "@/types/types";

import { FREE_VOTE_INTERVAL } from "@/constants";
import { db } from "@/db";
import env from "@/env";
import { Icon, Notification_Type } from "@/generated/prisma";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { updateProfileStatsOnVote } from "@/lib/profile-stats";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";
import { stripe } from "@/lib/stripe";
import { getActiveVoteMultiplier } from "@/lib/vote-multiplier";

import type { FreeVote, GetLatestVotes, GetTopVotersForVotee, GetVotesByProfileId, IsFreeVoteAvailable, PayVote } from "./vote.routes";

import { updateLastFreeVote, validateFreeVote } from "./vote.action";

export const freeVote: AppRouteHandler<FreeVote> = async (c) => {
  const data = c.req.valid("json");

  // Prevent users from voting for themselves
  if (data.voterId === data.voteeId) {
    return sendErrorResponse(c, "badRequest", "You cannot vote for yourself");
  }

  // Check if voting is enabled for the contest
  const contest = await db.contest.findUnique({
    where: { id: data.contestId },
    select: { isVotingEnabled: true },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  if (!contest.isVotingEnabled) {
    return sendErrorResponse(c, "badRequest", "Voting is not enabled for this contest yet");
  }

  if (!(await validateFreeVote(data.voterId))) {
    return sendErrorResponse(c, "tooManyRequests", "You can only use a free vote once every 24 hours for this contest");
  }

  // Fetch minimal info to personalize the notification
  const [voter, votee] = await Promise.all([
    db.profile.findUnique({
      where: { id: data.voterId },
      select: {
        id: true,
        user: { select: { name: true, username: true } },
      },
    }),
    db.profile.findUnique({
      where: { id: data.voteeId },
      select: {
        id: true,
        user: { select: { username: true } },
      },
    }),
  ]);

  if (!votee) {
    return sendErrorResponse(c, "notFound", "Votee not found");
  }
  if (!voter) {
    return sendErrorResponse(c, "notFound", "Voter not found");
  }

  const vote = await db.vote.create({ data });

  await updateLastFreeVote(data.voterId);

  // Update ProfileStats for the votee
  await updateProfileStatsOnVote(votee.id, "FREE", 1);

  // Notify the votee that they received a free vote
  try {
    const voterName = voter.user.name ?? "Someone";
    const voterUsername = voter.user.username;

    await db.notification.create({
      data: {
        profileId: data.voteeId,
        title: "Free vote received",
        message: `${voterName} sent you a free vote`,
        type: Notification_Type.VOTE_RECEIVED,
        icon: Icon.SUCCESS,
        action: voterUsername ? `/profile/${voterUsername}` : undefined,
      },
    });
  } catch {
    // Intentionally do not fail the request if notification creation fails
  }

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

  // Prevent users from voting for themselves
  if (voterId === voteeId) {
    return sendErrorResponse(c, "badRequest", "You cannot vote for yourself");
  }

  // Validate vote count is supported
  if (voteCount <= 0) {
    return sendErrorResponse(c, "badRequest", "Vote count must be greater than 0");
  }

  // For custom votes, validate reasonable limits
  if (voteCount > 1000) {
    return sendErrorResponse(c, "badRequest", "Vote count cannot exceed 1000");
  }

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
            username: true,
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

  // Check if voting is enabled for the contest
  if (!contest.isVotingEnabled) {
    return sendErrorResponse(c, "badRequest", "Voting is not enabled for this contest yet");
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

  // Calculate price based on vote count (pricing tiers)
  const getPriceForVoteCount = (count: number): number => {
    switch (count) {
      case 5:
        return 1; // $1 for 5 votes
      case 25:
        return 5; // $5 for 25 votes
      case 50:
        return 10; // $10 for 50 votes
      default:
        return count * 0.2; // $0.20 per vote for custom votes
    }
  };

  const totalPrice = getPriceForVoteCount(voteCount);
  const activeMultiplier = await getActiveVoteMultiplier();
  const unitPrice = Math.round((totalPrice / voteCount) * 100);

  const payment = await db.payment.create({
    data: {
      amount: totalPrice,
      status: "PENDING",
      payerId: voter.id,
      stripeSessionId: "",
      // Store voting intent data
      intendedVoteeId: votee.id,
      intendedContestId: contest.id,
      intendedVoteCount: voteCount * activeMultiplier,
      intendedComment: null,
    },
  });

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
          unit_amount: unitPrice,
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
    success_url: `${env.FRONTEND_URL}/payments/success?callback=/profile/${votee.user.username}`,
    cancel_url: `${env.FRONTEND_URL}/payments/failure?callback=/profile/${votee.user.username}`,
    // Custom styling options
    custom_fields: [
      {
        key: "comment",
        label: {
          type: "custom",
          custom: `Message for ${votee.user.name} (Optional)`,
        },
        type: "text",
        optional: true,
      },
    ],
    billing_address_collection: "auto",
    // Custom branding
    // payment_method_types: ["card", "cashapp", "afterpay_clearpay", "paypal"],
    allow_promotion_codes: true,
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

  // console.log(session.url);

  return c.json(formattedStripeSession, HttpStatusCodes.OK);
};

export const getLatestVotes: AppRouteHandler<GetLatestVotes> = async (c) => {
  const { page, limit, search } = c.req.valid("query");

  const skip = (page - 1) * limit;
  const take = limit;

  const where: Prisma.VoteWhereInput = {};

  if (search) {
    const fields: (keyof Prisma.UserWhereInput)[] = ["name", "username", "email", "displayUsername"];

    where.OR = fields.map(field => ({
      votee: {
        user: {
          [field]: { contains: search },
        },
      },
    }));
  }

  const [votes, totalVotes] = await Promise.all([
    db.vote.findMany({
      skip,
      take,
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        votee: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                image: true,
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
                image: true,
              },
            },
          },
        },
        count: true,
        comment: true,
        createdAt: true,
      },
    }),
    db.vote.count({ where }),
  ]);

  const formattedVotes = votes.map(vote => ({
    votee: vote.votee?.user
      ? {
          name: vote.votee.user.name,
          id: vote.votee.id,
          profilePicture: vote.votee.user.image ?? "",
        }
      : null,
    voter: vote.voter?.user
      ? {
          name: vote.voter.user.name,
          id: vote.voter.id,
          profilePicture: vote.voter.user.image ?? "",
        }
      : null,
    totalVotes: vote.count,
    comment: vote.comment,
    createdAt: vote.createdAt.toISOString(),
  }));

  const pagination = calculatePaginationMetadata(totalVotes, page, limit);

  return c.json({ data: formattedVotes, pagination }, HttpStatusCodes.OK);
};

export const getVotesByProfileId: AppRouteHandler<GetVotesByProfileId> = async (c) => {
  const { profileId } = c.req.valid("param");
  const { page, limit, onlyPaid } = c.req.valid("query");

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const skip = (page - 1) * limit;
  const take = limit;

  const [votes, total] = await Promise.all([
    db.vote.findMany({
      where: {
        voteeId: profile.id,
        ...(onlyPaid ? { paymentId: { not: null } } : {}),
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        payment: {
          select: {
            amount: true,
          },
        },
        voter: {
          select: {
            user: {
              select: {
                name: true,
                username: true,
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
      where: {
        voteeId: profile.id,
        ...(onlyPaid ? { paymentId: { not: null } } : {}),
      },
    }),
  ]);

  const formattedVotesReceived = votes.map(vote => ({
    profileId: vote.voter.user.profile?.id ?? "",
    name: vote.voter.user.name,
    username: vote.voter.user.username ?? "Anonymous User",
    contestName: vote.contest.name,
    votedOn: vote.createdAt.toISOString(),
    amount: vote.payment?.amount ?? null,
    comment: vote.comment,
    count: vote.count,
  }));

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: formattedVotesReceived, pagination }, HttpStatusCodes.OK);
};

export const getTopVotersForVotee: AppRouteHandler<GetTopVotersForVotee> = async (c) => {
  const { profileId } = c.req.valid("param");

  // First check if the votee profile exists
  const voteeProfile = await db.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  if (!voteeProfile) {
    return sendErrorResponse(c, "notFound", "Votee profile not found");
  }

  // Get top 10 voters for this votee with aggregated vote counts and latest vote info
  const topVoters = await db.vote.groupBy({
    by: ["voterId"],
    where: {
      voteeId: profileId,
    },
    _sum: {
      count: true,
    },
    _max: {
      createdAt: true,
    },
    orderBy: {
      _sum: {
        count: "desc",
      },
    },
    take: 10,
  });

  // Get detailed information for each top voter
  const topVotersWithDetails = await Promise.all(
    topVoters.map(async (voter, index) => {
      const voterProfile = await db.profile.findUnique({
        where: { id: voter.voterId },
        select: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      });

      // Get the latest vote with comment for this voter
      const latestVote = await db.vote.findFirst({
        where: {
          voterId: voter.voterId,
          voteeId: profileId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          comment: true,
          createdAt: true,
        },
      });

      return {
        rank: index + 1,
        profileId: voter.voterId,
        userName: voterProfile?.user.name ?? "Anonymous User",
        profilePicture: voterProfile?.user.image ?? "",
        totalVotesGiven: voter._sum.count ?? 0,
        comment: latestVote?.comment ?? null,
        lastVoteAt: latestVote?.createdAt.toISOString() ?? "",
      };
    }),
  );

  return c.json(topVotersWithDetails, HttpStatusCodes.OK);
};
