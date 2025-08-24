import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { AssignManualRankRoute, ListRoute, UpdateComputedRanksRoute } from "./ranks.routes";

// Helper function to compute and assign ranks based on vote counts
async function computeAndAssignRanks() {
  // Get the highest manual rank to ensure computed ranks start after it
  const highestManualRank = await db.rank.aggregate({
    _max: {
      manualRank: true,
    },
  });

  const manualRankOffset = highestManualRank._max.manualRank || 0;

  // Get all profiles with votes, ordered by vote count (descending)
  const profilesWithVotes = await db.profile.findMany({
    where: {
      votesReceived: {
        some: {}, // Has at least one vote
      },
      // Exclude profiles that already have manual ranks
      rank: {
        manualRank: null,
      },
    },
    select: {
      id: true,
      _count: {
        select: {
          votesReceived: true,
        },
      },
    },
    orderBy: {
      votesReceived: {
        _count: "desc",
      },
    },
  });

  // Assign computed ranks starting after the highest manual rank
  for (let i = 0; i < profilesWithVotes.length; i++) {
    const profile = profilesWithVotes[i];
    const computedRank = manualRankOffset + i + 1;

    // Upsert the rank record
    await db.rank.upsert({
      where: {
        profileId: profile.id,
      },
      update: {
        computedRank,
        updatedAt: new Date(),
      },
      create: {
        profileId: profile.id,
        computedRank,
      },
    });
  }

  return profilesWithVotes.length;
}

export { computeAndAssignRanks };

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { limit, page } = c.req.valid("query");

  // Get all ranks (both manual and computed) with profile info
  const allRanks = await db.rank.findMany({
    select: {
      id: true,
      manualRank: true,
      computedRank: true,
      profile: {
        select: {
          id: true,
          user: {
            select: {
              name: true,
              image: true,
              username: true,
            },
          },
          _count: {
            select: {
              votesReceived: true,
            },
          },
        },
      },
    },
    orderBy: [
      { manualRank: "asc" },
      { computedRank: "asc" },
    ],
  });

  // Transform ranks to final ranking format
  const transformedRanks = allRanks.map((rank) => {
    // Manual ranks take priority
    if (rank.manualRank !== null) {
      return {
        id: rank.id,
        rank: rank.manualRank,
        profile: {
          id: rank.profile.id,
          name: rank.profile.user.name,
          image: rank.profile.user.image,
          username: rank.profile.user.username,
        },
        votesReceived: rank.profile._count.votesReceived,
        isManual: true,
      };
    }

    // Computed ranks (already stored in DB)
    if (rank.computedRank !== null) {
      return {
        id: rank.id,
        rank: rank.computedRank,
        profile: {
          id: rank.profile.id,
          name: rank.profile.user.name,
          image: rank.profile.user.image,
          username: rank.profile.user.username,
        },
        votesReceived: rank.profile._count.votesReceived,
        isManual: false,
      };
    }

    // Fallback for profiles without any rank
    return {
      id: rank.id,
      rank: 999999, // Very high rank for unranked profiles
      profile: {
        id: rank.profile.id,
        name: rank.profile.user.name,
        image: rank.profile.user.image,
        username: rank.profile.user.username,
      },
      votesReceived: rank.profile._count.votesReceived,
      isManual: false,
    };
  });

  // Sort by rank (manual first, then computed)
  transformedRanks.sort((a, b) => a.rank - b.rank);

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRanks = transformedRanks.slice(startIndex, endIndex);

  // Format response according to schema
  const formattedRanks = paginatedRanks.map(rank => ({
    id: rank.id,
    rank: rank.rank,
    profile: {
      id: rank.profile.id,
      name: rank.profile.name,
      image: rank.profile.image || undefined,
      username: rank.profile.username ?? "",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const pagination = calculatePaginationMetadata(transformedRanks.length, page, limit);

  return c.json({
    data: formattedRanks,
    pagination,
  }, HttpStatusCodes.OK);
};

export const assignManualRank: AppRouteHandler<AssignManualRankRoute> = async (c) => {
  const { profileId, manualRank } = c.req.valid("json");

  // Check if the profile exists
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    include: {
      user: {
        select: {
          name: true,
          image: true,
          username: true,
        },
      },
    },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Check if this manual rank is already assigned to another profile
  const existingRank = await db.rank.findFirst({
    where: {
      manualRank,
      profileId: {
        not: profileId,
      },
    },
  });

  if (existingRank) {
    return sendErrorResponse(c, "conflict", "Rank already assigned to another profile");
  }

  // Assign the manual rank
  const rank = await db.rank.upsert({
    where: {
      profileId,
    },
    update: {
      manualRank,
      updatedAt: new Date(),
    },
    create: {
      profileId,
      manualRank,
    },
  });

  // Return the updated rank with profile info
  const formattedRank = {
    id: rank.id,
    rank: manualRank,
    profile: {
      id: profile.id,
      name: profile.user.name,
      image: profile.user.image || undefined,
      username: profile.user.username ?? "",
    },
    createdAt: rank.createdAt.toISOString(),
    updatedAt: rank.updatedAt.toISOString(),
  };

  return c.json(
    {
      success: true,
      message: `Manual rank ${manualRank} assigned successfully`,
      rank: formattedRank,
    },
    HttpStatusCodes.OK,
  );
};

export const updateComputedRanks: AppRouteHandler<UpdateComputedRanksRoute> = async (c) => {
  const startTime = Date.now();
  const { batchSize = 1000, forceUpdate = false } = c.req.valid("json");

  try {
    // Get the highest manual rank to ensure computed ranks start after it
    const highestManualRank = await db.rank.aggregate({
      _max: {
        manualRank: true,
      },
    });

    const manualRankOffset = highestManualRank._max.manualRank || 0;

    // Get total count of profiles with votes for progress tracking
    const totalProfiles = await db.profile.count({
      where: {
        votesReceived: {
          some: {}, // Has at least one vote
        },
        // Exclude profiles that already have manual ranks
        rank: {
          manualRank: null,
        },
      },
    });

    if (totalProfiles === 0) {
      return c.json({
        success: true,
        message: "No profiles with votes found to rank",
        summary: {
          totalProfiles: 0,
          profilesUpdated: 0,
          profilesCreated: 0,
          processingTime: Date.now() - startTime,
          batchesProcessed: 0,
        },
      }, HttpStatusCodes.OK);
    }

    let profilesUpdated = 0;
    let profilesCreated = 0;
    let batchesProcessed = 0;
    let offset = 0;

    // Process profiles in batches for scalability
    while (offset < totalProfiles) {
      // Get batch of profiles with votes, ordered by vote count (descending)
      const profilesBatch = await db.profile.findMany({
        where: {
          votesReceived: {
            some: {}, // Has at least one vote
          },
          // Exclude profiles that already have manual ranks
          rank: {
            manualRank: null,
          },
        },
        select: {
          id: true,
          _count: {
            select: {
              votesReceived: true,
            },
          },
        },
        orderBy: {
          votesReceived: {
            _count: "desc",
          },
        },
        take: batchSize,
        skip: offset,
      });

      if (profilesBatch.length === 0)
        break;

      // Process batch in parallel for better performance
      const batchPromises = profilesBatch.map(async (profile, index) => {
        const computedRank = manualRankOffset + offset + index + 1;

        // Check if rank record exists
        const existingRank = await db.rank.findUnique({
          where: { profileId: profile.id },
          select: { id: true, computedRank: true },
        });

        if (existingRank) {
          // Only update if rank changed or force update is enabled
          if (forceUpdate || existingRank.computedRank !== computedRank) {
            await db.rank.update({
              where: { id: existingRank.id },
              data: {
                computedRank,
                updatedAt: new Date(),
              },
            });
            return { updated: true, created: false };
          }
          return { updated: false, created: false };
        }
        else {
          // Create new rank record
          await db.rank.create({
            data: {
              profileId: profile.id,
              computedRank,
            },
          });
          return { updated: false, created: true };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Count results
      batchResults.forEach((result) => {
        if (result.updated)
          profilesUpdated++;
        if (result.created)
          profilesCreated++;
      });

      batchesProcessed++;
      offset += batchSize;

      // Add small delay between batches to prevent overwhelming the database
      if (offset < totalProfiles) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    const processingTime = Date.now() - startTime;

    return c.json({
      success: true,
      message: `Successfully updated computed ranks for ${totalProfiles} profiles`,
      summary: {
        totalProfiles,
        profilesUpdated,
        profilesCreated,
        processingTime,
        batchesProcessed,
      },
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Error updating computed ranks:", error);
    return c.json({
      success: false,
      message: "Failed to update computed ranks",
      error: {
        issues: [{
          code: "RANK_UPDATE_ERROR",
          path: [],
          message: error instanceof Error ? error.message : "Unknown error",
        }],
        name: "ValidationError",
      },
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};
