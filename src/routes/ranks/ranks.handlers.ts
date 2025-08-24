import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { AssignManualRankRoute, ListRoute } from "./ranks.routes";

// Helper function to compute and assign ranks based on vote counts
async function computeAndAssignRanks() {
  // Get all profiles with votes, ordered by vote count (descending)
  const profilesWithVotes = await db.profile.findMany({
    where: {
      votesReceived: {
        some: {}, // Has at least one vote
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

  // Assign computed ranks starting from 1
  for (let i = 0; i < profilesWithVotes.length; i++) {
    const profile = profilesWithVotes[i];
    const computedRank = i + 1;

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

  // First, get profiles with manual ranks (admin-assigned top 20)
  const manualRanks = await db.rank.findMany({
    where: {
      manualRank: {
        not: null,
      },
    },
    select: {
      id: true,
      manualRank: true,
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
    orderBy: {
      manualRank: "asc",
    },
  });

  // Get profiles with computed ranks (based on vote counts)
  const computedRanks = await db.rank.findMany({
    where: {
      computedRank: {
        not: null,
      },
      manualRank: null, // Only get those without manual ranks
    },
    select: {
      id: true,
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
    orderBy: {
      computedRank: "asc",
    },
  });

  // Find the highest manual rank to ensure computed ranks start after it
  const highestManualRank = manualRanks.length > 0
    ? Math.max(...manualRanks.map(r => r.manualRank!))
    : 0;

  // Get profiles without any rank but with votes (to compute their rank)
  const unrankedProfiles = await db.profile.findMany({
    where: {
      rank: null, // No rank assigned yet
      votesReceived: {
        some: {}, // Has at least one vote
      },
    },
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
    orderBy: {
      votesReceived: {
        _count: "desc",
      },
    },
  });

  // Combine and sort all rankings
  const allRanks = [
    // Manual ranks first (admin-assigned)
    ...manualRanks.map(rank => ({
      id: rank.id,
      rank: rank.manualRank!,
      profile: {
        id: rank.profile.id,
        name: rank.profile.user.name,
        image: rank.profile.user.image,
        username: rank.profile.user.username,
      },
      votesReceived: rank.profile._count.votesReceived,
      isManual: true,
    })),

    // Computed ranks (auto-assigned based on votes)
    ...computedRanks.map(rank => ({
      id: rank.id,
      rank: rank.computedRank! + highestManualRank, // Ensure computed ranks start after manual ranks
      profile: {
        id: rank.profile.id,
        name: rank.profile.user.name,
        image: rank.profile.user.image,
        username: rank.profile.user.username,
      },
      votesReceived: rank.profile._count.votesReceived,
      isManual: false,
    })),

    // Unranked profiles (assign computed ranks based on vote count)
    ...unrankedProfiles.map((profile, index) => {
      const baseRank = highestManualRank + computedRanks.length + index + 1;
      return {
        id: profile.id,
        rank: baseRank,
        profile: {
          id: profile.id,
          name: profile.user.name,
          image: profile.user.image,
          username: profile.user.username,
        },
        votesReceived: profile._count.votesReceived,
        isManual: false,
      };
    }),
  ];

  // Sort by rank to ensure proper ordering
  allRanks.sort((a, b) => a.rank - b.rank);
  console.log(allRanks);

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRanks = allRanks.slice(startIndex, endIndex);

  // Format response according to schema
  const formattedRanks = paginatedRanks.map(rank => ({
    id: rank.id,
    rank: rank.rank,
    profile: {
      id: rank.profile.id,
      name: rank.profile.name,
      image: rank.profile.image || undefined, // Convert null to undefined
      username: rank.profile.username ?? "",
    },
    createdAt: new Date().toISOString(), // You might want to get this from the actual rank record
    updatedAt: new Date().toISOString(), // You might want to get this from the actual rank record
  }));

  const pagination = calculatePaginationMetadata(allRanks.length, page, limit);

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
    return c.json(
      {
        error: {
          issues: [{ code: "PROFILE_NOT_FOUND", path: ["profileId"], message: "Profile not found" }],
          name: "ValidationError",
        },
        success: false,
      },
      HttpStatusCodes.BAD_REQUEST,
    );
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
    return c.json(
      {
        error: {
          issues: [{ code: "RANK_CONFLICT", path: ["manualRank"], message: `Rank ${manualRank} is already assigned to another profile` }],
          name: "ValidationError",
        },
        success: false,
      },
      HttpStatusCodes.CONFLICT,
    );
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
