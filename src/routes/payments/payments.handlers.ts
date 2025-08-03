import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db/index";
import { stripe } from "@/lib/stripe";

import type { PayVote } from "./payments.routes";

export const payVote: AppRouteHandler<PayVote> = async (c) => {
  const { userId, voteCount, contestId } = c.req.valid("json");

  const existingProfile = await db.profile.findUnique({
    where: { userId },
  });

  if (!existingProfile) {
    return c.json("User not found", HttpStatusCodes.NOT_FOUND);
  }

  const contestParticipant = await db.contestParticipation.findFirst({
    where: {
      profileId: existingProfile.id,
      contestId,
    },
  });

  if (!contestParticipant) {
    return c.json("Participant not part of the contest", HttpStatusCodes.NOT_FOUND);
  }

  const session = await stripe.checkout.sessions.create({
    metadata: {
      profileId: contestParticipant.profileId.toString(),
      contestId: contestParticipant.contestId.toString(),
      voteCount: voteCount.toString(),
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Vote Credits",
          },
          unit_amount: 100,
        },
        quantity: voteCount,
      },
    ],
    mode: "payment",
    success_url: "https://your-app.com/success",
    cancel_url: "https://your-app.com/cancel",
  });

  if (!session) {
    return c.json("Session cannot be created", HttpStatusCodes.SERVICE_UNAVAILABLE);
  }

  if (!session.url) {
    return c.json("Session URL not found", HttpStatusCodes.NOT_FOUND);
  }

  const formattedStripeSession = {
    url: session.url,
  };

  console.log(formattedStripeSession);

  return c.json(formattedStripeSession, HttpStatusCodes.OK);
};
