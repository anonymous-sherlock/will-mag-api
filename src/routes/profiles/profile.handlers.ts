import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { getCacheService } from "@/lib/cache/cache-service";
import { CacheUtils, ProfileCacheUtils } from "@/lib/cache/cache-utils";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";
import { utapi } from "@/lib/uploadthing";

import type {
  CreateRoute,
  GetActiveParticipationByProfileRoute,
  GetByUserIdRoute,
  GetByUsernameRoute,
  GetOneRoute,
  GetProfileStatsRoute,
  ListRoute,
  PatchRoute,
  RemoveProfileImageRoute,
  RemoveRoute,
  UploadBannerImageRoute,
  UploadCoverImageRoute,
  UploadProfilePhotosRoute,
} from "./profile.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");

  // Use cached data for both profiles and total count with hit information
  const [profilesResult, countResult] = await Promise.all([
    CacheUtils.cacheWithInfo(
      async () => {
        return db.profile.findMany({
          skip: (page - 1) * limit,
          take: limit,
          include: {
            coverImage: {
              select: {
                id: true,
                key: true,
                caption: true,
                url: true,
              },
            },
            bannerImage: {
              select: {
                id: true,
                key: true,
                caption: true,
                url: true,
              },
            },
            user: {
              select: {
                name: true,
                displayUsername: true,
                username: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });
      },
      `profile:list:page:${page}:limit:${limit}`,
      300,
    ),
    CacheUtils.cacheWithInfo(
      async () => {
        return db.profile.count();
      },
      `profile:count:page:${page}:limit:${limit}`,
      300,
    ),
  ]);

  const profiles = profilesResult.data;
  const total = countResult.data;
  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json(
    {
      data: profiles,
      pagination,
    },
    HttpStatusCodes.OK,
  );
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const profile = c.req.valid("json");
  const insertedProfile = await db.profile.upsert({
    where: { userId: profile.userId },
    update: {
      ...profile,
    },
    create: {
      ...profile,
    },
  });

  // Invalidate profile list cache when a profile is created/updated
  const cache = getCacheService();
  await cache.invalidateByTags(["profile", "list"]);

  return c.json(insertedProfile, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const profile = await db.profile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          displayUsername: true,
          email: true,
          type: true,
        },
      },
      coverImage: {
        select: {
          id: true,
          key: true,
          caption: true,
          url: true,
        },
      },
      bannerImage: {
        select: {
          id: true,
          key: true,
          caption: true,
          url: true,
        },
      },
      profilePhotos: {
        select: {
          id: true,
          key: true,
          caption: true,
          url: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!profile)
    return sendErrorResponse(c, "notFound", "Profile not found");

  return c.json(profile, HttpStatusCodes.OK);
};

export const getByUserId: AppRouteHandler<GetByUserIdRoute> = async (c) => {
  const { userId } = c.req.valid("param");
  const profile = await db.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          displayUsername: true,
          email: true,
          type: true,
        },
      },
      coverImage: {
        select: {
          id: true,
          key: true,
          caption: true,
          url: true,
        },
      },
      bannerImage: {
        select: {
          id: true,
          key: true,
          caption: true,
          url: true,
        },
      },
      profilePhotos: {
        select: {
          id: true,
          key: true,
          caption: true,
          url: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!profile)
    return sendErrorResponse(c, "notFound", "Profile not found");

  return c.json(profile, HttpStatusCodes.OK);
};

export const getByUsername: AppRouteHandler<GetByUsernameRoute> = async (c) => {
  const { username } = c.req.valid("param");

  // First find the user by username
  const user = await db.user.findUnique({
    where: { username },
    select: {
      profile: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              displayUsername: true,
              email: true,
              type: true,
            },
          },
          coverImage: {
            select: {
              id: true,
              key: true,
              caption: true,
              url: true,
            },
          },
          bannerImage: {
            select: {
              id: true,
              key: true,
              caption: true,
              url: true,
            },
          },
          profilePhotos: {
            select: {
              id: true,
              key: true,
              caption: true,
              url: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  if (!user || !user.profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Return the profile with included cover image and profile photos
  return c.json(user.profile, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { user, ...profileData } = c.req.valid("json");

  const profile = await db.profile.findUnique({
    where: { id },
  });

  if (!profile)
    return sendErrorResponse(c, "notFound", "Profile not found");

  // Update profile and user separately
  const [updatedProfile] = await Promise.all([
    db.profile.update({
      where: { id },
      data: profileData,
    }),
    db.user.update({
      where: { id: profile.userId },
      data: {
        displayUsername: user.displayUsername,
        username: user.username,
        name: user.name,
      },
    }),
  ]);

  // Invalidate profile list cache when a profile is updated
  const cache = getCacheService();
  await cache.invalidateByTags(["profile", "list"]);

  return c.json(updatedProfile, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const profile = await db.profile.findUnique({
    where: { id },
  });

  if (!profile)
    return sendErrorResponse(c, "notFound", "Profile not found");

  await db.profile.delete({
    where: { id },
  });

  // Invalidate profile list cache when a profile is deleted
  const cache = getCacheService();
  await cache.invalidateByTags(["profile", "list"]);

  return c.json({ message: "Profile deleted successfully" }, HttpStatusCodes.OK);
};

export const uploadCoverImage: AppRouteHandler<UploadCoverImageRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { file } = c.req.valid("form");

  if (!file) {
    return sendErrorResponse(c, "badRequest", "No file uploaded");
  }

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id },
    include: { coverImage: true },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Store reference to old cover image for deletion
  const oldCoverImage = profile.coverImage;

  // Upload file using utapi
  const uploaded = await utapi.uploadFiles([file], {
    concurrency: 6,
    acl: "public-read",
    contentDisposition: "inline",
  });

  if (!uploaded || !uploaded[0]) {
    return sendErrorResponse(c, "badRequest", "Upload failed");
  }

  const files = uploaded[0].data;
  if (!files) {
    return sendErrorResponse(c, "badRequest", "Upload failed");
  }

  // Create media record
  const media = await db.media.create({
    data: {
      key: files.key,
      url: files.ufsUrl,
      size: files.size,
      name: files.name,
      status: "COMPLETED",
      mediaType: "PROFILE_COVER_IMAGE",
      type: file.type || "image/jpeg",
    },
  });

  // Update profile with new cover image
  const updatedProfile = await db.profile.update({
    where: { id },
    data: {
      coverImageId: media.id,
    },
    include: {
      coverImage: true,
    },
  });
  await db.user.update({
    where: {
      id: updatedProfile.userId,
    },
    data: {
      image: media.url,
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
    }
    catch (error) {
      console.error("Error deleting old cover image:", error);
      // Don't fail the request if deletion fails, just log it
    }
  }

  return c.json(updatedProfile, HttpStatusCodes.OK);
};

export const uploadBannerImage: AppRouteHandler<UploadBannerImageRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { file } = c.req.valid("form");

  if (!file) {
    return sendErrorResponse(c, "badRequest", "No file uploaded");
  }

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id },
    include: { bannerImage: true },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Store reference to old banner image for deletion
  const oldBannerImage = profile.bannerImage;

  // Upload file using utapi
  const uploaded = await utapi.uploadFiles([file], {
    concurrency: 6,
    acl: "public-read",
    contentDisposition: "inline",
  });

  if (!uploaded || !uploaded[0]) {
    return sendErrorResponse(c, "badRequest", "Upload failed");
  }

  const files = uploaded[0].data;
  if (!files) {
    return sendErrorResponse(c, "badRequest", "Upload failed");
  }

  // Create media record
  const media = await db.media.create({
    data: {
      key: files.key,
      url: files.ufsUrl,
      size: files.size,
      name: files.name,
      status: "COMPLETED",
      mediaType: "PROFILE_BANNER_IMAGE",
      type: file.type || "image/jpeg",
    },
  });

  // Update profile with new banner image
  const updatedProfile = await db.profile.update({
    where: { id },
    data: {
      bannerImageId: media.id,
    },
    include: {
      bannerImage: true,
    },
  });

  // Delete old banner image if it exists
  if (oldBannerImage) {
    try {
      // Delete from file storage
      await utapi.deleteFiles([oldBannerImage.key]);

      // Delete from database
      await db.media.delete({
        where: { id: oldBannerImage.id },
      });
    }
    catch (error) {
      console.error("Error deleting old banner image:", error);
      // Don't fail the request if deletion fails, just log it
    }
  }

  return c.json(updatedProfile, HttpStatusCodes.OK);
};

export const uploadProfilePhotos: AppRouteHandler<UploadProfilePhotosRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { files } = c.req.valid("form");

  const fileArray = Array.isArray(files) ? files : [files];

  if (!fileArray || fileArray.length === 0) {
    return sendErrorResponse(c, "badRequest", "No files uploaded");
  }

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id },
    include: { profilePhotos: true },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Upload files using utapi
  const uploaded = await utapi.uploadFiles(fileArray, {
    concurrency: 6,
    acl: "public-read",
    contentDisposition: "inline",
  });

  if (!uploaded || uploaded.length === 0) {
    return sendErrorResponse(c, "badRequest", "Upload failed");
  }

  // Create media records for successfully uploaded files
  const mediaRecords = [];
  for (const upload of uploaded) {
    if (upload.data) {
      const media = await db.media.create({
        data: {
          key: upload.data.key,
          url: upload.data.ufsUrl,
          size: upload.data.size,
          name: upload.data.name,
          status: "COMPLETED",
          mediaType: "PROFILE_IMAGE",
          type: upload.data.type || "image/jpeg",
          profileId: profile.id,
        },
      });
      mediaRecords.push(media);
    }
  }

  if (mediaRecords.length === 0) {
    return sendErrorResponse(c, "badRequest", "No files were successfully uploaded");
  }

  // Get updated profile with all photos
  const updatedProfile = await db.profile.findUnique({
    where: { id },
    include: {
      profilePhotos: true,
      coverImage: true,
    },
  });

  if (!updatedProfile) {
    return sendErrorResponse(c, "notFound", "Profile not found after update");
  }

  return c.json(updatedProfile, HttpStatusCodes.OK);
};

export const removeProfileImage: AppRouteHandler<RemoveProfileImageRoute> = async (c) => {
  const { id, imageId } = c.req.valid("param");

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id },
    include: { profilePhotos: true },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Check if image exists and belongs to this profile
  const image = await db.media.findFirst({
    where: {
      id: imageId,
      profileId: id,
    },
  });

  if (!image) {
    return sendErrorResponse(c, "notFound", "Image not found or does not belong to this profile");
  }

  try {
    // Delete from file storage
    await utapi.deleteFiles([image.key]);

    // Delete from database
    await db.media.delete({
      where: { id: imageId },
    });

    return c.json({ message: "Image removed successfully" }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Error removing profile image:", error);
    return sendErrorResponse(c, "badRequest", "Failed to remove image");
  }
};

export const getProfileStats: AppRouteHandler<GetProfileStatsRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const profile = await db.profile.findFirst({
    where: { id },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const now = new Date();

  // Get all contest participations for this profile
  const participations = await db.contestParticipation.findMany({
    where: { profileId: profile.id },
    include: {
      contest: true,
    },
  });

  // Get all votes received by this profile
  const votesReceived = await db.vote.findMany({
    where: { voteeId: profile.id },
  });

  // Get all votes given by this profile
  const votesGiven = await db.vote.findMany({
    where: { voterId: profile.id },
  });

  // Calculate statistics
  const totalCompetitions = participations.length;
  const activeContests = participations.filter(p =>
    p.contest.startDate <= now && p.contest.endDate >= now,
  ).length;

  const totalVotesReceived = votesReceived.reduce((sum, vote) => sum + vote.count, 0);
  const totalVotes = votesGiven.reduce((sum, vote) => sum + vote.count, 0);

  // Calculate earnings based on contests won
  const wonContests = await db.contest.findMany({
    where: {
      winnerProfileId: profile.id,
      endDate: { lt: now }, // Only completed contests
    },
  });

  const totalEarnings = wonContests.reduce((sum, contest) => sum + contest.prizePool, 0);

  // Calculate rank statistics
  const contestRanks = [];
  for (const participation of participations) {
    if (participation.contest.endDate < now) {
      // Contest has ended, calculate rank
      const allParticipants = await db.contestParticipation.findMany({
        where: {
          contestId: participation.contest.id,
          isParticipating: true,
        },
      });

      const participantVotes = await Promise.all(
        allParticipants.map(async (p) => {
          const votes = await db.vote.aggregate({
            where: {
              contestId: participation.contest.id,
              voteeId: p.profileId,
            },
            _sum: { count: true },
          });
          return {
            profileId: p.profileId,
            totalVotes: votes._sum.count || 0,
          };
        }),
      );

      participantVotes.sort((a, b) => b.totalVotes - a.totalVotes);
      const rank = participantVotes.findIndex(p => p.profileId === profile.id) + 1;
      if (rank > 0) {
        contestRanks.push(rank);
      }
    }
  }

  const averageRank = contestRanks.length > 0
    ? contestRanks.reduce((sum, rank) => sum + rank, 0) / contestRanks.length
    : 0;
  const bestRank = contestRanks.length > 0 ? Math.min(...contestRanks) : 0;
  const currentRank = contestRanks.length > 0 ? contestRanks[contestRanks.length - 1] : 0;

  // Calculate win rate (contests where rank is 1)
  const wins = contestRanks.filter(rank => rank === 1).length;
  const winRate = contestRanks.length > 0 ? (wins / contestRanks.length) * 100 : 0;

  // Get total participants across all contests
  const totalParticipants = await db.contestParticipation.count({
    where: { profileId: profile.id },
  });

  const stats = {
    currentRank,
    totalCompetitions,
    totalEarnings,
    activeContests,
    totalVotes,
    totalVotesReceived,
    winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
    averageRank: Math.round(averageRank * 100) / 100,
    bestRank,
    totalParticipants,
  };

  return c.json(stats, HttpStatusCodes.OK);
};

export const getActiveParticipationByProfile: AppRouteHandler<GetActiveParticipationByProfileRoute> = async (c) => {
  const { profileId } = c.req.valid("param");
  const { page, limit } = c.req.valid("query");

  // Check if profile exists
  const profile = await db.profile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const now = new Date();

  // Use caching for the active participations query
  const result = await ProfileCacheUtils.cacheProfileActiveParticipation(
    profileId,
    page,
    limit,
    async () => {
      // Get active participations (contests that are currently running)
      const [participations, total] = await db.$transaction([
        db.contestParticipation.findMany({
          where: {
            profileId,
            contest: {
              startDate: { lte: now },
              endDate: { gte: now },
              status: { in: ["ACTIVE", "VOTING", "JUDGING", "PUBLISHED", "BOOKED"] },

            },
            isParticipating: true,
          },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            contest: {
              include: {
                awards: true,
                images: {
                  select: {
                    id: true,
                    url: true,
                    key: true,
                  },
                },
              },
            },
            coverImage: {
              select: {
                id: true,
                url: true,
                key: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        db.contestParticipation.count({
          where: {
            profileId,
            contest: {
              startDate: { lte: now },
              endDate: { gte: now },
              status: { in: ["ACTIVE", "VOTING", "JUDGING", "PUBLISHED", "BOOKED"] },
            },
            isParticipating: true,
          },
        }),
      ]);

      const pagination = calculatePaginationMetadata(total, page, limit);

      return {
        data: participations,
        pagination,
      };
    },
    300, // Cache for 5 minutes
  );

  return c.json(result, HttpStatusCodes.OK);
};
