import { COMPUTED_RANK_START, FREE_VOTE_WEIGHT, MAX_MANUAL_RANK, PAID_VOTE_WEIGHT } from "@/constants";
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
 * Mock data for top 5 dummy entries
 */
const DUMMY_MODELS = [
  {
    name: "Emma Thompson",
    displayUsername: "EmmaT",
    username: "emma_thompson",
    bio: "Award-winning model and influencer with a passion for fashion and lifestyle content.",
    freeVotes: 1250,
    paidVotes: 320,
  },
  {
    name: "Sophia Martinez",
    displayUsername: "SophiaM",
    username: "sophia_martinez",
    bio: "Professional model specializing in commercial and editorial photography.",
    freeVotes: 1180,
    paidVotes: 285,
  },
  {
    name: "Olivia Chen",
    displayUsername: "OliviaC",
    username: "olivia_chen",
    bio: "Fashion model and content creator known for stunning editorial work.",
    freeVotes: 1100,
    paidVotes: 250,
  },
  {
    name: "Isabella Rodriguez",
    displayUsername: "IsabellaR",
    username: "isabella_rodriguez",
    bio: "Versatile model working across fashion, beauty, and lifestyle campaigns.",
    freeVotes: 1050,
    paidVotes: 220,
  },
  {
    name: "Ava Williams",
    displayUsername: "AvaW",
    username: "ava_williams",
    bio: "Rising star in the modeling industry with a unique and captivating presence.",
    freeVotes: 980,
    paidVotes: 195,
  },
];

/**
 * Get or create dummy profile and participation for a contest
 * Creates placeholder entries for top 5 ranks with mock data
 */
async function getOrCreateDummyEntries(
  tx: any,
  contestId: string,
  rank: number
): Promise<{ profileId: string; participationId: string; freeVotes: number; paidVotes: number }> {
  const dummyData = DUMMY_MODELS[rank - 1]; // rank is 1-indexed, array is 0-indexed
  const uniqueUsername = `${dummyData.username}_${contestId.substring(0, 8)}`;

  // Check if dummy participation already exists for this rank and contest
  const existingDummy = await tx.contestParticipation.findFirst({
    where: {
      contestId,
      profile: {
        user: {
          username: uniqueUsername,
        },
      },
    },
    select: { id: true, profileId: true },
  });

  if (existingDummy) {
    return {
      profileId: existingDummy.profileId,
      participationId: existingDummy.id,
      freeVotes: dummyData.freeVotes,
      paidVotes: dummyData.paidVotes,
    };
  }

  // Create dummy user with unique email per contest (use upsert to handle existing)
  const uniqueEmail = `${dummyData.username}_${contestId.substring(0, 8)}_${rank}@dummy.com`;

  // Try to find existing user by email first
  let dummyUser = await tx.user.findUnique({
    where: { email: uniqueEmail },
  });

  if (!dummyUser) {
    // Try to find by username if email doesn't exist
    dummyUser = await tx.user.findUnique({
      where: { username: uniqueUsername },
    });
  }

  if (!dummyUser) {
    // Create new user
    dummyUser = await tx.user.create({
      data: {
        email: uniqueEmail,
        emailVerified: true,
        username: uniqueUsername,
        displayUsername: dummyData.displayUsername,
        name: dummyData.name,
        role: "USER",
        type: "MODEL",
      },
    });
  } else {
    // Update existing user
    dummyUser = await tx.user.update({
      where: { id: dummyUser.id },
      data: {
        displayUsername: dummyData.displayUsername,
        name: dummyData.name,
      },
    });
  }

  // Get or create dummy profile
  let dummyProfile = await tx.profile.findUnique({
    where: { userId: dummyUser.id },
  });

  if (!dummyProfile) {
    dummyProfile = await tx.profile.create({
      data: {
        userId: dummyUser.id,
        address: "123 Fashion Avenue, New York, NY",
        bio: dummyData.bio,
        city: "New York",
        country: "United States",
      },
    });
  } else {
    // Update bio if it's the default placeholder
    if (dummyProfile.bio === "This is a placeholder entry for top rankings" || !dummyProfile.bio) {
      await tx.profile.update({
        where: { id: dummyProfile.id },
        data: { bio: dummyData.bio },
      });
    }
  }

  // Get or create dummy participation
  let dummyParticipation = await tx.contestParticipation.findFirst({
    where: {
      profileId: dummyProfile.id,
      contestId,
    },
  });

  if (!dummyParticipation) {
    dummyParticipation = await tx.contestParticipation.create({
      data: {
        profileId: dummyProfile.id,
        contestId,
        isApproved: true,
        isParticipating: true,
      },
    });
  }

  return {
    profileId: dummyProfile.id,
    participationId: dummyParticipation.id,
    freeVotes: dummyData.freeVotes,
    paidVotes: dummyData.paidVotes,
  };
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
        // 1. Fetch all participants (excluding dummy entries)
        const allParticipants = await tx.contestParticipation.findMany({
          where: { contestId },
          select: { profileId: true, id: true, profile: { select: { user: { select: { username: true } } } } },
        });

        // Filter out dummy participants
        const participants = allParticipants.filter(
          (p) => !p.profile.user.username?.startsWith("dummy_model_")
        );

        const participantIds = participants.map((p) => p.profileId);

        // 2. Aggregate votes in bulk (only if there are real participants)
        const voteAggregates = participantIds.length > 0
          ? await tx.vote.groupBy({
              by: ["voteeId", "type"],
              where: {
                contestId,
                voteeId: { in: participantIds },
              },
              _sum: { count: true },
            })
          : [];

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
          .sort((a, b) => b.weightedScore - a.weightedScore);

        // 5. Clear existing rankings
        await tx.contestRanking.deleteMany({ where: { contestId } });

        // 6. Create dummy entries for ranks 1-5 (always create these) with mock data
        const dummyRankings = [];
        for (let rank = 1; rank <= MAX_MANUAL_RANK; rank++) {
          const dummy = await getOrCreateDummyEntries(tx, contestId, rank);
          dummyRankings.push({
            contestId,
            profileId: dummy.profileId,
            participationId: dummy.participationId,
            rank,
            freeVotes: dummy.freeVotes,
            paidVotes: dummy.paidVotes,
          });
        }

        // 7. Insert dummy rankings
        if (dummyRankings.length > 0) {
          await tx.contestRanking.createMany({
            data: dummyRankings,
            skipDuplicates: true,
          });
        }

        // 8. Insert real rankings starting from rank 6 (COMPUTED_RANK_START) if there are any
        if (rankedParticipants.length > 0) {
          const realRankings = rankedParticipants.map((p, i) => ({
            contestId,
            profileId: p.profileId,
            participationId: p.participationId,
            rank: i + COMPUTED_RANK_START,
            freeVotes: p.freeVotes,
            paidVotes: p.paidVotes,
          }));

          // 9. Insert real rankings in batches
          for (let i = 0; i < realRankings.length; i += BATCH_SIZE) {
            const batch = realRankings.slice(i, i + BATCH_SIZE);

            await tx.contestRanking.createMany({
              data: batch,
              skipDuplicates: true,
            });
          }
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
