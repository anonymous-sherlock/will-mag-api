import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { AppRouteHandler } from "@/types/types";

import { db } from '@/db';

import type { vote as VoteRoute, getLatestVotes as GetLatestVotes } from './vote.routes';

export const vote: AppRouteHandler<typeof VoteRoute> = async c => {
  const data = c.req.valid('json');
  // Check if this is a free vote
  if (data.type === 'FREE') {
    // Get the voter's profile
    const profile = await db.profile.findUnique({
      where: { id: data.voterId },
      select: { lastFreeVoteAt: true },
    });
    if (profile && profile.lastFreeVoteAt) {
      const now = new Date();
      const last = new Date(profile.lastFreeVoteAt);
      const diff = now.getTime() - last.getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        return c.json(
          {
            error: {
              issues: [
                {
                  code: 'TOO_MANY_REQUESTS',
                  path: ['type'],
                  message: 'You can only use a free vote once every 24 hours for this contest.',
                },
              ],
              name: 'FreeVoteLimitError',
            },
            success: false,
          },
          HttpStatusCodes.UNPROCESSABLE_ENTITY
        );
      }
    }
  } // Create the vote
  const vote = await db.vote.create({ data });
  // If free vote, update lastFreeVoteAt
  if (data.type === 'FREE') {
    await db.profile.update({
      where: { id: data.voterId },
      data: { lastFreeVoteAt: new Date() },
    });
  }
  return c.json({ ...vote }, HttpStatusCodes.OK);
};

export const getLatestVotes: AppRouteHandler<typeof GetLatestVotes> = async c => {
  const votes = await db.vote.findMany({
    orderBy: {
      createdAt: 'desc',
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

  const formattedVotes = votes.map(vote => {
    return {
      name: vote.votee.user.name,
      profileId: vote.votee.user.id,
      createdAt: vote.createdAt.toISOString(),
    };
  });

  return c.json(formattedVotes, HttpStatusCodes.OK);
};
