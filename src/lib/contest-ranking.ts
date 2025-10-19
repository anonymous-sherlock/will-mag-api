import { FREE_VOTE_WEIGHT, PAID_VOTE_WEIGHT } from "@/constants";
import { db } from "@/db";

export interface ContestRankingData {
  profileId: string;
  username: string;
  displayUsername: string | null;
  coverImage: string | null;
  freeVotes: number;
  paidVotes: number;
  totalVotes: number;
  rank: number;
}

export interface ContestRankingOptions {
  contestId: string;
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Calculate weighted score for contest ranking
 * Paid votes have higher weight than free votes
 */
export function calculateWeightedScore(freeVotes: number, paidVotes: number): number {
  return paidVotes * PAID_VOTE_WEIGHT + freeVotes * FREE_VOTE_WEIGHT;
}

/**
 * Get contest participants with their vote statistics and weighted scores
 */
export async function getContestParticipantsWithVotes(
  contestId: string,
  includeInactive: boolean = false
): Promise<
  Array<{
    profileId: string;
    username: string;
    displayUsername: string | null;
    coverImage: string | null;
    freeVotes: number;
    paidVotes: number;
    isParticipating: boolean;
    isApproved: boolean;
  }>
> {
  // Get all participants for the contest
  const participants = await db.contestParticipation.findMany({
    where: {
      contestId,
      ...(includeInactive ? {} : { isParticipating: true }),
    },
    include: {
      profile: {
        include: {
          user: {
            select: {
              username: true,
              displayUsername: true,
            },
          },
          coverImage: {
            select: {
              url: true,
            },
          },
        },
      },
    },
  });

  // Get vote statistics for all participants in parallel
  const participantsWithVotes = await Promise.all(
    participants.map(async (participation) => {
      const [freeVotesResult, paidVotesResult] = await Promise.all([
        db.vote.aggregate({
          where: {
            contestId,
            voteeId: participation.profileId,
            type: "FREE",
          },
          _sum: {
            count: true,
          },
        }),
        db.vote.aggregate({
          where: {
            contestId,
            voteeId: participation.profileId,
            type: "PAID",
          },
          _sum: {
            count: true,
          },
        }),
      ]);

      const freeVotes = freeVotesResult._sum.count || 0;
      const paidVotes = paidVotesResult._sum.count || 0;
      const totalVotes = freeVotes + paidVotes;

      return {
        profileId: participation.profileId,
        username: participation.profile.user.username || "",
        displayUsername: participation.profile.user.displayUsername,
        coverImage: participation.profile.coverImage?.url || null,
        freeVotes,
        paidVotes,
        totalVotes,
        isParticipating: participation.isParticipating || true,
        isApproved: participation.isApproved,
      };
    })
  );

  return participantsWithVotes;
}

/**
 * Update contest rankings in the database
 * This should be called through a cron job or a scheduled task to update the rankings every 1 hour
 */
const BATCH_SIZE = 20;
const MAX_RETRIES = 3;

export async function updateContestRankings(contestId: string): Promise<void> {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      await db.$transaction(async (tx) => {
        // 1. Fetch all participants
        const participants = await tx.contestParticipation.findMany({
          where: { contestId },
          select: { profileId: true, id: true },
        });

        if (participants.length === 0) return;

        const participantIds = participants.map((p) => p.profileId);

        // 2. Aggregate votes in bulk
        const voteAggregates = await tx.vote.groupBy({
          by: ["voteeId", "type"],
          where: {
            contestId,
            voteeId: { in: participantIds },
          },
          _sum: { count: true },
        });

        // 3. Build map of votes per participant
        const voteMap = new Map<string, { free: number; paid: number }>();
        for (const { voteeId, type, _sum } of voteAggregates) {
          if (!voteMap.has(voteeId)) {
            voteMap.set(voteeId, { free: 0, paid: 0 });
          }
          const entry = voteMap.get(voteeId)!;
          if (type === "FREE") entry.free = _sum.count ?? 0;
          if (type === "PAID") entry.paid = _sum.count ?? 0;
        }

        // 4. Merge participants with votes and calculate weighted score
        const rankedParticipants = participants
          .map((p) => {
            const votes = voteMap.get(p.profileId) ?? { free: 0, paid: 0 };
            const weightedScore = calculateWeightedScore(votes.free, votes.paid);
            return {
              profileId: p.profileId,
              participationId: p.id,
              freeVotes: votes.free,
              paidVotes: votes.paid,
              weightedScore,
            };
          })
          .sort((a, b) => b.weightedScore - a.weightedScore)
          .map((p, i) => ({
            ...p,
            rank: i + 1,
          }));

        // 5. Clear existing rankings
        await tx.contestRanking.deleteMany({ where: { contestId } });

        // 6. Insert rankings in batches using createMany
        for (let i = 0; i < rankedParticipants.length; i += BATCH_SIZE) {
          const batch = rankedParticipants.slice(i, i + BATCH_SIZE);

          await tx.contestRanking.createMany({
            data: batch.map((p) => ({
              contestId,
              profileId: p.profileId,
              participationId: p.participationId,
              rank: p.rank,
              freeVotes: p.freeVotes,
              paidVotes: p.paidVotes,
            })),
            skipDuplicates: true, // safer in case of unique constraint
          });
        }
      });

      // Success, break out of retry loop
      break;
    } catch (error: any) {
      if (error.code === "P2034") {
        attempt++;
        console.warn(`Deadlock detected while updating contest rankings (attempt ${attempt}/${MAX_RETRIES}). Retrying...`);
        await new Promise((res) => setTimeout(res, 100 * attempt)); // exponential backoff
        continue;
      }
      console.error("Error updating contest rankings:", error);
      throw error;
    }
  }
}
