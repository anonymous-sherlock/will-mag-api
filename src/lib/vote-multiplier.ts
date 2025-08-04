import { db } from "@/db";

/**
 * Get the active vote multiplier for the current time
 * @returns The multiplier value (defaults to 1 if no active period)
 */
export async function getActiveVoteMultiplier(): Promise<number> {
  const now = new Date();

  const activeMultiplier = await db.voteMultiplierPeriod.findFirst({
    where: {
      isActive: true,
      startTime: {
        lte: now,
      },
      endTime: {
        gte: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return activeMultiplier?.multiplierTimes || 1;
}

/**
 * Get the active vote multiplier period details
 * @returns The active multiplier period or null if none exists
 */
export async function getActiveVoteMultiplierPeriod() {
  const now = new Date();

  const activeMultiplier = await db.voteMultiplierPeriod.findFirst({
    where: {
      isActive: true,
      startTime: {
        lte: now,
      },
      endTime: {
        gte: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return activeMultiplier;
}

/**
 * Calculate the total votes after applying multiplier
 * @param originalVoteCount The original number of votes
 * @returns The total votes after applying the active multiplier
 */
export async function calculateVotesWithMultiplier(originalVoteCount: number): Promise<{
  originalVotes: number;
  multiplier: number;
  totalVotes: number;
  hasActiveMultiplier: boolean;
}> {
  const multiplier = await getActiveVoteMultiplier();
  const totalVotes = originalVoteCount * multiplier;

  return {
    originalVotes: originalVoteCount,
    multiplier,
    totalVotes,
    hasActiveMultiplier: multiplier > 1,
  };
}
