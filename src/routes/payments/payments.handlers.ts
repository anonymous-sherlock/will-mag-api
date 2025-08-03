import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { AppRouteHandler } from '@/types/types';

import { db } from '@/db/index';
import { stripe } from '@/lib/stripe';

import type { PayVote } from './payments.routes';
import { sendErrorResponse } from '@/helpers/send-error-response';
import env from '@/env';

export const payVote: AppRouteHandler<PayVote> = async c => {
  const { voteeId, voterId, voteCount, contestId } = c.req.valid('json');

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
    return sendErrorResponse(c, 'notFound', 'Votee with the shared profile id was not found');
  }

  if (!voter) {
    return sendErrorResponse(c, 'notFound', 'Voter with the shared profile id was not found');
  }

  if (!contest) {
    return sendErrorResponse(c, 'notFound', 'Contest with the shared contest id was not found');
  }

  const isVoteePresent = await db.contestParticipation.findFirst({
    where: {
      contestId: contestId,
      profileId: votee.id,
    },
  });

  if (!isVoteePresent) {
    return sendErrorResponse(c, 'notFound', 'Votee is not a participant in the contest');
  }

  const payment = await db.payment.create({
    data: {
      amount: parseFloat(voteCount),
      status: 'PENDING',
      payerId: voter.id,
      stripeSessionId: '',
    },
  });

  const session = await stripe.checkout.sessions.create({
    metadata: {
      paymentId: payment.id,
      voteeId: votee.id,
      contestId: contest.id,
      voterId: voter.id,
      voteCount: voteCount,
    },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: 100,
          product_data: {
            name: 'Vote Credits',
            description: voteCount + 'votes for ' + votee.user.name,
          },
        },
        quantity: parseInt(voteCount),
      },
    ],
    mode: 'payment',
    success_url: env.FRONTEND_URL + '/success',
    cancel_url: env.FRONTEND_URL + '/cancel',
  });

  if (!session) {
    return sendErrorResponse(c, 'serviceUnavailable', 'Session was not created');
  }

  if (!session.url) {
    return sendErrorResponse(c, 'notFound', 'Session URL was not found');
  }

  const formattedStripeSession = {
    url: session.url,
  };

  console.log(formattedStripeSession);

  return c.json(formattedStripeSession, HttpStatusCodes.OK);
};
