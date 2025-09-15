import * as HttpStatusCodes from "stoker/http-status-codes";

import type { Prisma } from "@/generated/prisma";
import type { AppRouteHandler, ProfileWithRankAndStats, TransformedRankData } from "@/types/types";

import { COMPUTED_RANK_START, FILL_MANUAL_GAPS_WITH_COMPUTED, FREE_VOTE_WEIGHT, MAX_MANUAL_RANK, PAID_VOTE_WEIGHT } from "@/constants";
import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { AssignManualRankRoute, GetProfileRankRoute, ListRoute, RemoveManualRankRoute, UpdateComputedRanksRoute } from "./ranks.routes";

/**
 * Find available manual rank gaps and computed starting rank.
 */
async function getRankAssignmentConfig(): Promise<{ availableManualGaps: number[]; computedRankStart: number }> {
  const manualRanks = await db.rank.findMany({
    where: { manualRank: { not: null } },
    select: { manualRank: true },
  });

  const assigned = new Set(manualRanks.map(r => r.manualRank!).filter(Boolean));
  const availableManualGaps: number[] = [];

  for (let i = 1; i <= MAX_MANUAL_RANK; i++) {
    if (!assigned.has(i))
      availableManualGaps.push(i);
  }

  return { availableManualGaps, computedRankStart: COMPUTED_RANK_START };
}

/**
 * Sort profiles deterministically by weighted score, then total votes, then createdAt.
 */
function sortProfilesByScore<T extends { weightedScore: number; totalVotes: number; createdAt: Date }>(arr: T[]): T[] {
  return arr.sort((a, b) => {
    if (b.weightedScore !== a.weightedScore)
      return b.weightedScore - a.weightedScore;
    if (b.totalVotes !== a.totalVotes)
      return b.totalVotes - a.totalVotes;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/**
 * Internal recompute logic for computed ranks.
 */
async function updateComputedRanksInternal() {
  const { availableManualGaps, computedRankStart } = await getRankAssignmentConfig();

  const profiles = await db.profile.findMany({
    where: {
      user: { type: "MODEL" },
      NOT: { rank: { is: { manualRank: { not: null } } } }, // exclude manual ranks
    },
    select: {
      id: true,
      createdAt: true,
      stats: { select: { freeVotes: true, paidVotes: true, weightedScore: true } },
    },
  });

  if (profiles.length === 0)
    return { totalProfiles: 0, profilesUpdated: 0, profilesCreated: 0 };

  const profilesWithScores = profiles.map(p => ({
    id: p.id,
    createdAt: p.createdAt,
    weightedScore: p.stats?.weightedScore ?? 0,
    totalVotes: (p.stats?.paidVotes ?? 0) + (p.stats?.freeVotes ?? 0),
  }));

  sortProfilesByScore(profilesWithScores);

  let profilesUpdated = 0;
  let profilesCreated = 0;

  await db.$transaction(async (tx) => {
    // clear old computed ranks
    await tx.rank.updateMany({ where: { computedRank: { not: null } }, data: { computedRank: null } });

    const usedRanks = new Set(
      (await tx.rank.findMany({ where: { manualRank: { not: null } }, select: { manualRank: true } }))
        .map(r => r.manualRank!)
        .filter(Boolean),
    );

    for (let i = 0; i < profilesWithScores.length; i++) {
      let computedRank: number;

      if (FILL_MANUAL_GAPS_WITH_COMPUTED && i < availableManualGaps.length) {
        // Fill manual gaps with computed ranks
        computedRank = availableManualGaps[i];
      } else {
        // Start computed ranks from COMPUTED_RANK_START
        computedRank = computedRankStart + i;
      }

      while (usedRanks.has(computedRank)) computedRank++;
      usedRanks.add(computedRank);

      const existing = await tx.rank.findUnique({ where: { profileId: profilesWithScores[i].id }, select: { id: true } });
      if (existing) {
        await tx.rank.update({ where: { id: existing.id }, data: { computedRank, updatedAt: new Date() } });
        profilesUpdated++;
      } else {
        await tx.rank.create({ data: { profileId: profilesWithScores[i].id, computedRank } });
        profilesCreated++;
      }
    }
  });

  return { totalProfiles: profilesWithScores.length, profilesUpdated, profilesCreated };
}

export const updateComputedRanks: AppRouteHandler<UpdateComputedRanksRoute> = async (c) => {
  const startTime = Date.now();
  try {
    const { availableManualGaps } = await getRankAssignmentConfig();
    const { totalProfiles, profilesUpdated, profilesCreated } = await updateComputedRanksInternal();
    return c.json({
      success: true,
      message: `Successfully updated computed ranks for ${totalProfiles} profiles`,
      summary: {
        totalProfiles,
        profilesUpdated,
        profilesCreated,
        processingTime: Date.now() - startTime,
        availableManualGaps: availableManualGaps.length,
        scoringWeights: { paidVoteWeight: PAID_VOTE_WEIGHT, freeVoteWeight: FREE_VOTE_WEIGHT },
      },
    }, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Error updating computed ranks:", error);
    return c.json({
      success: false,
      error: {
        issues: [{ code: "INTERNAL_ERROR", path: [], message: "Failed to update computed ranks" }],
        name: "InternalServerError",
      },
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const assignManualRank: AppRouteHandler<AssignManualRankRoute> = async (c) => {
  const { profileId, manualRank } = c.req.valid("json");

  if (manualRank < 1 || manualRank > MAX_MANUAL_RANK)
    return sendErrorResponse(c, "badRequest", `manualRank must be between 1 and ${MAX_MANUAL_RANK}`);

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    include: {
      user: { select: { name: true, image: true, username: true, type: true } },
      stats: { select: { freeVotes: true, paidVotes: true } },
    },
  });
  if (!profile)
    return sendErrorResponse(c, "notFound", "Profile not found");
  if (profile.user.type !== "MODEL")
    return sendErrorResponse(c, "badRequest", "Manual ranks only for MODEL users");

  const conflict = await db.rank.findFirst({ where: { manualRank, profileId: { not: profileId } } });
  if (conflict)
    return sendErrorResponse(c, "conflict", "Rank already assigned to another profile");

  const rank = await db.rank.upsert({
    where: { profileId },
    update: { manualRank, computedRank: null },
    create: { profileId, manualRank },
  });

  await updateComputedRanksInternal();

  return c.json({
    success: true,
    message: `Manual rank ${manualRank} assigned successfully and computed ranks updated`,
    rank: {
      id: rank.id,
      rank: manualRank,
      stats: {
        freeVotes: profile.stats?.freeVotes ?? 0,
        paidVotes: profile.stats?.paidVotes ?? 0,
      },
      isManualRank: !!rank.manualRank,
      profile: { id: profile.id, name: profile.user.name, image: profile.user.image ?? undefined, username: profile.user.username ?? "" },
      createdAt: rank.createdAt.toISOString(),
      updatedAt: rank.updatedAt.toISOString(),
    },
  }, HttpStatusCodes.OK);
};

export const getProfileRank: AppRouteHandler<GetProfileRankRoute> = async (c) => {
  const { profileId } = c.req.valid("param");

  const profile = await db.profile.findFirst({
    where: { id: profileId, user: { type: "MODEL" } },
    select: {
      id: true,
      bio: true,
      user: { select: { name: true, image: true, username: true } },
      rank: { select: { id: true, manualRank: true, computedRank: true, createdAt: true, updatedAt: true } },
      stats: { select: { freeVotes: true, paidVotes: true, weightedScore: true } },
    },
  });
  if (!profile)
    return sendErrorResponse(c, "notFound", "Profile not found or not a MODEL user");

  const displayRank = profile.rank?.manualRank ?? profile.rank?.computedRank ?? "N/A" as number | "N/A";

  return c.json({
    id: profile.rank?.id ?? `temp-${profile.id}`,
    rank: displayRank,
    isManualRank: !!profile.rank?.manualRank,
    profile: { id: profile.id, name: profile.user.name, image: profile.user.image ?? undefined, username: profile.user.username ?? "", bio: profile.bio ?? undefined },
    stats: {
      freeVotes: profile.stats?.freeVotes ?? 0,
      paidVotes: profile.stats?.paidVotes ?? 0,
    },
    createdAt: profile.rank?.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: profile.rank?.updatedAt?.toISOString() ?? new Date().toISOString(),
  }, HttpStatusCodes.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { limit, page, search, profileId } = c.req.valid("query");

  const where: Prisma.ProfileWhereInput = {};

  let currentProfile: ProfileWithRankAndStats | null = null;

  if (profileId) {
    currentProfile = await db.profile.findUnique({
      where: { id: profileId },
      include: {
        rank: { select: { id: true, manualRank: true, computedRank: true, createdAt: true, updatedAt: true } },
        stats: { select: { freeVotes: true, paidVotes: true, weightedScore: true } },
        user: { select: { name: true, image: true, username: true } },
      },
    });
  }

  if (search) {
    where.OR = [
      { user: { email: { contains: search } } },
      { user: { name: { contains: search } } },
      { user: { username: { contains: search } } },
    ];
  }
  const allProfiles = await db.profile.findMany({
    where: {
      ...where,
      user: { type: "MODEL" },
      rank: { isNot: null },
    },
    select: {
      id: true,
      bio: true,
      user: { select: { name: true, image: true, username: true } },
      rank: { select: { id: true, manualRank: true, computedRank: true, createdAt: true, updatedAt: true } },
      stats: { select: { freeVotes: true, paidVotes: true, weightedScore: true } },
    },
  });

  const transformed: TransformedRankData[] = allProfiles.map((p) => {
    const rankValue = p.rank?.manualRank ?? p.rank?.computedRank ?? "N/A" as number | "N/A";
    return {
      id: p.rank?.id ?? `temp-${p.id}`,
      rank: rankValue,
      isManualRank: !!p.rank?.manualRank,
      profile: { id: p.id, name: p.user.name, image: p.user.image ?? undefined, username: p.user.username ?? "", bio: p.bio ?? undefined },
      stats: {
        freeVotes: p.stats?.freeVotes ?? 0,
        paidVotes: p.stats?.paidVotes ?? 0,
      },
      createdAt: p.rank?.createdAt ?? new Date(),
      updatedAt: p.rank?.updatedAt ?? new Date(),
    };
  });

  const transformedCurrentProfile: TransformedRankData | null = currentProfile
    ? (() => {
        const rankValue = currentProfile.rank?.manualRank ?? currentProfile.rank?.computedRank ?? "N/A" as number | "N/A";
        return {
          id: currentProfile.rank?.id ?? `temp-${currentProfile.id}`,
          rank: rankValue,
          isManualRank: !!currentProfile.rank?.manualRank,
          profile: { id: currentProfile.id, name: currentProfile.user.name, image: currentProfile.user.image ?? undefined, username: currentProfile.user.username ?? "", bio: currentProfile.bio ?? undefined },
          stats: {
            freeVotes: currentProfile.stats?.freeVotes ?? 0,
            paidVotes: currentProfile.stats?.paidVotes ?? 0,
          },
          createdAt: currentProfile.rank?.createdAt ?? new Date(),
          updatedAt: currentProfile.rank?.updatedAt ?? new Date(),
        };
      })()
    : null;

  transformed.sort((a, b) => {
    if (a.rank === "N/A")
      return 1;
    if (b.rank === "N/A")
      return -1;
    return (a.rank as number) - (b.rank as number);
  });

  const start = (page - 1) * limit;
  const pageItems = transformed.slice(start, start + limit);

  return c.json({
    currentProfile: transformedCurrentProfile,
    data: pageItems.map(r => ({
      ...r,
      profile: {
        ...r.profile,
        bio: r.profile.bio ?? undefined,
      },
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    pagination: calculatePaginationMetadata(transformed.length, page, limit),
  }, HttpStatusCodes.OK);
};

export const removeManualRank: AppRouteHandler<RemoveManualRankRoute> = async (c) => {
  const { profileId } = c.req.valid("json");

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    include: {
      user: { select: { name: true, image: true, username: true, type: true } },
      rank: true,
      stats: { select: { freeVotes: true, paidVotes: true } },
    },
  });

  if (!profile)
    return sendErrorResponse(c, "notFound", "Profile not found");

  if (profile.user.type !== "MODEL")
    return sendErrorResponse(c, "badRequest", "Manual ranks only apply to MODEL users");

  if (!profile.rank || !profile.rank.manualRank)
    return sendErrorResponse(c, "badRequest", "Profile does not currently have a manual rank");

  // Remove manual rank by setting it to null
  const updatedRank = await db.rank.update({
    where: { profileId },
    data: { manualRank: null },
  });

  // Recompute computed ranks after freeing the manual slot
  await updateComputedRanksInternal();

  return c.json({
    success: true,
    message: `Manual rank removed successfully and computed ranks updated`,
    rank: {
      id: updatedRank.id,
      rank: updatedRank.computedRank ?? ("N/A" as const),
      profile: {
        id: profile.id,
        name: profile.user.name,
        image: profile.user.image ?? undefined,
        username: profile.user.username ?? "",
        bio: profile.bio ?? undefined,
      },
      stats: {
        freeVotes: profile.stats?.freeVotes ?? 0,
        paidVotes: profile.stats?.paidVotes ?? 0,
      },
      isManualRank: false,
      createdAt: updatedRank.createdAt.toISOString(),
      updatedAt: updatedRank.updatedAt.toISOString(),
    },
  }, HttpStatusCodes.OK);
};
