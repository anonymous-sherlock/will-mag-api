import { FREE_VOTE_WEIGHT, PAID_VOTE_WEIGHT } from "@/constants";
import { db } from "@/db";

/**
 * Update ProfileStats when a vote is created
 * This function should be called whenever a vote is added to maintain accurate counts
 */
export async function updateProfileStatsOnVote(
  voteeId: string,
  voteType: "FREE" | "PAID",
  voteCount: number,
) {
  try {
    await db.$transaction(async (tx) => {
      // Get or create ProfileStats for the votee
      const existingStats = await tx.profileStats.findUnique({
        where: { profileId: voteeId },
      });

      if (existingStats) {
        // Update existing stats
        const newFreeVotes = voteType === "FREE"
          ? existingStats.freeVotes + voteCount
          : existingStats.freeVotes;

        const newPaidVotes = voteType === "PAID"
          ? existingStats.paidVotes + voteCount
          : existingStats.paidVotes;

        const newWeightedScore = (newPaidVotes * PAID_VOTE_WEIGHT) + (newFreeVotes * FREE_VOTE_WEIGHT);

        await tx.profileStats.update({
          where: { profileId: voteeId },
          data: {
            freeVotes: newFreeVotes,
            paidVotes: newPaidVotes,
            weightedScore: newWeightedScore,
            lastUpdated: new Date(),
          },
        });
      }
      else {
        // Create new stats record
        const freeVotes = voteType === "FREE" ? voteCount : 0;
        const paidVotes = voteType === "PAID" ? voteCount : 0;
        const weightedScore = (paidVotes * PAID_VOTE_WEIGHT) + (freeVotes * FREE_VOTE_WEIGHT);

        await tx.profileStats.create({
          data: {
            profileId: voteeId,
            freeVotes,
            paidVotes,
            weightedScore,
            lastUpdated: new Date(),
          },
        });
      }
    });
  }
  catch (error) {
    console.error("Error updating ProfileStats:", error);
    // Don't throw - we don't want vote creation to fail if stats update fails
  }
}

/**
 * Recalculate ProfileStats for a specific profile based on all their votes
 * This is useful for data migration or fixing inconsistencies
 */
export async function recalculateProfileStats(profileId: string) {
  try {
    const votes = await db.vote.findMany({
      where: { voteeId: profileId },
      select: { type: true, count: true },
    });

    let freeVotes = 0;
    let paidVotes = 0;

    for (const vote of votes) {
      if (vote.type === "FREE") {
        freeVotes += vote.count;
      }
      else {
        paidVotes += vote.count;
      }
    }

    const weightedScore = (paidVotes * PAID_VOTE_WEIGHT) + (freeVotes * FREE_VOTE_WEIGHT);

    await db.profileStats.upsert({
      where: { profileId },
      update: {
        freeVotes,
        paidVotes,
        weightedScore,
        lastUpdated: new Date(),
      },
      create: {
        profileId,
        freeVotes,
        paidVotes,
        weightedScore,
        lastUpdated: new Date(),
      },
    });

    return { freeVotes, paidVotes, weightedScore };
  }
  catch (error) {
    console.error("Error recalculating ProfileStats:", error);
    throw error;
  }
}

/**
 * Recalculate ProfileStats for all MODEL profiles
 * This is useful for initial data migration
 */
export async function recalculateAllProfileStats(): Promise<Array<{ profileId: string; freeVotes: number; paidVotes: number; weightedScore: number }>> {
  try {
    const modelProfiles = await db.profile.findMany({
      where: { user: { type: "MODEL" } },
      select: { id: true },
    });

    const results: Array<{ profileId: string; freeVotes: number; paidVotes: number; weightedScore: number }> = [];
    for (const profile of modelProfiles) {
      const stats = await recalculateProfileStats(profile.id);
      results.push({ profileId: profile.id, ...stats });
    }

    return results;
  }
  catch (error) {
    console.error("Error recalculating all ProfileStats:", error);
    throw error;
  }
}
