import * as HttpStatusCodes from "stoker/http-status-codes";

import type { Prisma } from "@/generated/prisma";
import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { getCacheService } from "@/lib/cache";
import { ContestCacheUtils } from "@/lib/cache/cache-utils";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";
import { utapi } from "@/lib/uploadthing";

import type { BulkToggleParticipantApprovalRoute, CheckParticipationRoute, GetContestWinnerRoute, GetParticipantsRoute, JoinRoute, LeaveRoute, SetContestWinnerRoute, ToggleParticipantApprovalRoute, UploadParticipationCoverImageRoute } from "./contest-participation.routes";

export const join: AppRouteHandler<JoinRoute> = async (c) => {
  const { profileId, contestId } = c.req.valid("json");

  const profile = await db.profile.findFirst({
    where: { id: profileId },
  });

  const contest = await db.contest.findFirst({
    where: {
      id: contestId,
    },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }
  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  const existing = await db.contestParticipation.findFirst({
    where: {
      profileId: profile.id,
      contestId: contest.id,
    },
  });
  if (existing) {
    return sendErrorResponse(c, "conflict", "Participant already joined the contest");
  }

  const participation = await db.contestParticipation.create({
    data: {
      contestId: contest.id,
      profileId: profile.id,
    },
    include: {
      contest: true,
      coverImage: true,
    },
  });

  // Invalidate cache after participation change
  const cache = getCacheService();
  await cache.invalidateContestCache(contest.id, "participation");

  return c.json(participation, HttpStatusCodes.OK);
};

export const leave: AppRouteHandler<LeaveRoute> = async (c) => {
  const { profileId, contestId } = c.req.valid("json");

  const profile = await db.profile.findFirst({
    where: { id: profileId },
  });

  const contest = await db.contest.findFirst({
    where: {
      id: contestId,
    },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }
  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  const existing = await db.contestParticipation.findFirst({
    where: {
      profileId: profile.id,
      contestId: contest.id,
    },
  });

  if (!existing) {
    return sendErrorResponse(c, "notFound", "Contest participation not found");
  }

  const deletedParticipation = await db.contestParticipation.delete({
    where: {
      id: existing.id,
    },
    include: {
      coverImage: true,
    },
  });

  // Invalidate cache after participation change
  const cache = getCacheService();
  await cache.invalidateContestCache(contest.id, "participation");

  return c.json(deletedParticipation, HttpStatusCodes.OK);
};

export const getParticipants: AppRouteHandler<GetParticipantsRoute> = async (c) => {
  const { contestId: id } = c.req.valid("param");
  const { page, limit, search, status } = c.req.valid("query");

  // Check if contest exists first (this should be cached separately)
  const contest = await db.contest.findUnique({
    where: { id },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Use cache utility for contest participants with vote counts
  const result = await ContestCacheUtils.cacheContestParticipantsWithVotes(
    id,
    page,
    limit,
    search ?? undefined,
    status ?? undefined,
    async () => {
      const where: Prisma.ContestParticipationWhereInput = {};

      switch (status) {
        case "all":
          break;
        case "approved":
          where.isApproved = true;
          break;
        case "pending":
          where.isApproved = false;
          break;
      }

      if (search) {
        where.OR = [
          {
            profile: {
              user: {
                OR: [
                  { name: { contains: search } },
                  { username: { contains: search } },
                  { email: { contains: search } },
                ],
              },
            },
          },
        ];
      }

      const [participants, total] = await Promise.all([
        db.contestParticipation.findMany({
          where: { contestId: id, ...where },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            isApproved: true,
            isParticipating: true,
            createdAt: true,
            updatedAt: true,
            coverImage: {
              select: {
                key: true,
                caption: true,
                url: true,
              },
            },
            profile: {
              select: {
                id: true,
                bio: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    image: true,
                    username: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        db.contestParticipation.count({
          where: { contestId: id, ...where },
        }),
      ]);

      // Get vote counts for each participant
      const votes = await db.vote.groupBy({
        by: ["voteeId", "type"],
        where: {
          contestId: id,
          voteeId: { in: participants.map(p => p.profile.id) },
        },
        _sum: { count: true },
      });

      const voteMap = votes.reduce((acc, v) => {
        if (!acc[v.voteeId])
          acc[v.voteeId] = { FREE: 0, PAID: 0 };
        acc[v.voteeId][v.type] = v._sum.count || 0;
        return acc;
      }, {} as Record<string, { FREE: number; PAID: number }>);

      // Get total votes for the entire contest
      const [totalFreeVotes, totalPaidVotes] = await Promise.all([
        db.vote.aggregate({
          where: {
            contestId: id,
            type: "FREE",
          },
          _sum: {
            count: true,
          },
        }),
        db.vote.aggregate({
          where: {
            contestId: id,
            type: "PAID",
          },
          _sum: {
            count: true,
          },
        }),
      ]);

      const pagination = calculatePaginationMetadata(total, page, limit);

      const participantsWithVotes = participants.map((p) => {
        const counts = voteMap[p.profile.id] || { FREE: 0, PAID: 0 };
        return {
          ...p,
          totalFreeVotes: counts.FREE,
          totalPaidVotes: counts.PAID,
        };
      });

      return {
        data: participantsWithVotes,
        pagination,
        contest: {
          totalFreeVotes: totalFreeVotes._sum.count || 0,
          totalPaidVotes: totalPaidVotes._sum.count || 0,
          totalVotes: (totalFreeVotes._sum.count || 0) + (totalPaidVotes._sum.count || 0),
        },
      };
    },
    300, // 5 minutes cache
  );

  return c.json(result, HttpStatusCodes.OK);
};

export const getContestWinner: AppRouteHandler<GetContestWinnerRoute> = async (c) => {
  const { id } = c.req.valid("param");

  // Use cache utility for contest winner data
  const result = await ContestCacheUtils.cacheContestWinner(
    id,
    async () => {
      const contest = await db.contest.findUnique({
        where: { id },
        include: {
          awards: true,
          winner: true,
        },
      });

      if (!contest) {
        return null; // Will be handled by the caller
      }

      const totalParticipants = await db.contestParticipation.count({
        where: { contestId: id },
      });

      const totalVotes = await db.vote.count({
        where: { contestId: id },
      });

      return {
        contest,
        winner: contest.winner,
        totalParticipants,
        totalVotes,
      };
    },
    600, // 10 minutes cache
  );

  if (!result) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const setContestWinner: AppRouteHandler<SetContestWinnerRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { profileId } = c.req.valid("json");

  const contest = await db.contest.findUnique({
    where: { id },
    include: {
      awards: true,
    },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  const participant = await db.contestParticipation.findFirst({
    where: {
      contestId: id,
      profileId,
    },
  });

  if (!participant) {
    return sendErrorResponse(c, "notFound", "Profile is not a participant in this contest");
  }

  const updatedContest = await db.contest.update({
    where: { id },
    data: {
      winnerProfileId: profileId,
    },
    include: {
      awards: true,
      winner: true,
    },
  });

  // Get total participants
  const totalParticipants = await db.contestParticipation.count({
    where: { contestId: id },
  });

  // Get total votes for this contest
  const totalVotes = await db.vote.count({
    where: { contestId: id },
  });

  // Invalidate cache after contest update
  const cache = getCacheService();
  await cache.invalidateContestCache(id, "update");

  return c.json({
    contest: updatedContest,
    winner: updatedContest.winner,
    totalParticipants,
    totalVotes,
  }, HttpStatusCodes.OK);
};

export const checkParticipation: AppRouteHandler<CheckParticipationRoute> = async (c) => {
  const { profileId, contestId } = c.req.valid("param");

  const profile = await db.profile.findFirst({
    where: { id: profileId },
  });

  const contest = await db.contest.findFirst({
    where: { id: contestId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }
  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  const participation = await db.contestParticipation.findFirst({
    where: {
      profileId: profile.id,
      contestId: contest.id,
    },
    include: {
      coverImage: true,
    },
  });

  return c.json({
    hasJoined: !!participation,
    participation,
    contest,
  }, HttpStatusCodes.OK);
};

export const uploadParticipationCoverImage: AppRouteHandler<UploadParticipationCoverImageRoute> = async (c) => {
  const { participationId } = c.req.valid("param");
  const { file } = c.req.valid("form");

  if (!file) {
    return sendErrorResponse(c, "badRequest", "No file uploaded");
  }

  // Check if contest participation exists
  const participation = await db.contestParticipation.findUnique({
    where: { id: participationId },
    include: {
      contest: true,
      coverImage: true, // Include the current cover image
    },
  });

  if (!participation) {
    return sendErrorResponse(c, "notFound", "Contest participation not found");
  }

  // Store reference to old cover image for deletion
  const oldCoverImage = participation.coverImage;

  // Upload file using utapi
  const uploaded = await utapi.uploadFiles([file], {
    concurrency: 1,
    acl: "public-read",
    contentDisposition: "inline",
  });

  if (!uploaded || uploaded.length === 0 || !uploaded[0].data) {
    return sendErrorResponse(c, "badRequest", "Upload failed");
  }

  const upload = uploaded[0];

  // Create media record for the uploaded file
  const media = await db.media.create({
    data: {
      key: upload.data.key,
      url: upload.data.ufsUrl,
      size: upload.data.size,
      name: upload.data.name,
      status: "COMPLETED",
      mediaType: "CONTEST_PARTICIPATION_COVER",
      type: file.type || "image/jpeg",
      contestParticipationCover: {
        connect: {
          id: participationId,
        },
      },
    },
  });

  // Update participation with the uploaded image as cover image
  const updatedParticipation = await db.contestParticipation.update({
    where: { id: participationId },
    data: {
      mediaId: media.id,
    },
    include: {
      contest: true,
      coverImage: true,
    },
  });

  // Delete old cover image if it exists
  if (oldCoverImage) {
    try {
      // Delete from file storage
      await utapi.deleteFiles([oldCoverImage.key]);

      // Delete from database
      await db.media.delete({
        where: { id: oldCoverImage.id },
      });
    } catch (error) {
      console.error("Error deleting old cover image:", error);
      // Don't fail the request if deletion fails, just log it
    }
  }

  return c.json(updatedParticipation, HttpStatusCodes.OK);
};

// Helper function to invalidate cache for contest participations
async function invalidateContestParticipationCache(contestIds: string[]) {
  try {
    const cache = getCacheService();
    const uniqueContestIds = [...new Set(contestIds)];

    // Use both specific key invalidation and tag-based invalidation
    await Promise.all([
      // Invalidate specific contest participation cache keys
      ...uniqueContestIds.map(contestId =>
        cache.invalidateContestCache(contestId, "participation"),
      ),
      // Also invalidate by tags to catch all cached participant data
      cache.invalidateByTags(["contest", "leaderboard"]),
    ]);
  } catch (error) {
    console.warn("Cache invalidation error:", error);
  }
}

export const toggleParticipantApproval: AppRouteHandler<ToggleParticipantApprovalRoute> = async (c) => {
  const { participationId } = c.req.valid("param");

  // Check if contest participation exists
  const participation = await db.contestParticipation.findUnique({
    where: { id: participationId },
    include: {
      contest: true,
      coverImage: {
        select: {
          key: true,
          caption: true,
          url: true,
        },
      },
      profile: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
    },
  });

  if (!participation) {
    return sendErrorResponse(c, "notFound", "Contest participation not found");
  }

  // Toggle the isApproved status
  const updatedParticipation = await db.contestParticipation.update({
    where: { id: participationId },
    data: {
      isApproved: !participation.isApproved,
    },
    include: {
      contest: true,
      coverImage: {
        select: {
          key: true,
          caption: true,
          url: true,
        },
      },
      profile: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
    },
  });

  // Invalidate contest cache since participation status changed
  await invalidateContestParticipationCache([participation.contestId]);

  return c.json({
    participation: updatedParticipation,
    message: `Participant ${updatedParticipation.isApproved ? "approved" : "disapproved"} successfully`,
  }, HttpStatusCodes.OK);
};

export const bulkToggleParticipantApproval: AppRouteHandler<BulkToggleParticipantApprovalRoute> = async (c) => {
  const { participationIds, isApproved } = c.req.valid("json");

  if (!participationIds || participationIds.length === 0) {
    return sendErrorResponse(c, "badRequest", "No participation IDs provided");
  }

  // Check if all participations exist and get their contest IDs
  const existingParticipations = await db.contestParticipation.findMany({
    where: {
      id: { in: participationIds },
    },
    select: { id: true, contestId: true },
  });

  if (existingParticipations.length !== participationIds.length) {
    return sendErrorResponse(c, "notFound", "One or more contest participations not found");
  }

  // Bulk update the isApproved status
  const updateResult = await db.contestParticipation.updateMany({
    where: {
      id: { in: participationIds },
    },
    data: {
      isApproved: isApproved === "true" ? true : isApproved === "false" ? false : isApproved,
    },
  });

  // Invalidate cache for all affected contests
  const contestIds = existingParticipations.map(p => p.contestId);
  await invalidateContestParticipationCache(contestIds);

  return c.json({
    updatedCount: updateResult.count,
    message: `${updateResult.count} participants ${isApproved ? "approved" : "disapproved"} successfully`,
  }, HttpStatusCodes.OK);
};
