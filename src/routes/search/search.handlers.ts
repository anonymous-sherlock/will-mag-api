import * as HttpStatusCodes from "stoker/http-status-codes";

import type { Prisma } from "@/generated/prisma";
import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { SearchContests, SearchProfiles } from "./search.routes";

export const searchProfiles: AppRouteHandler<SearchProfiles> = async (c) => {
  const { page, limit, query, sortBy, sortOrder, city, country, gender, hasAvatar } = c.req.valid("query");

  const skip = (page - 1) * limit;
  const take = limit;

  // Build where clause for filtering
  const where: Prisma.ProfileWhereInput = {};

  if (query) {
    where.OR = [
      { bio: { search: query } },
      { city: { contains: query } },
      { country: { contains: query.toLowerCase() } },
      {
        user: {
          OR: [
            { name: { contains: query } },
            { username: { search: query } },
            { displayUsername: { contains: query } },
            { email: { contains: query } },
          ],
        },
      },
    ];
  }

  if (city) {
    where.city = { contains: city };
  }

  if (country) {
    where.country = { contains: country };
  }

  if (gender) {
    where.gender = gender;
  }

  if (hasAvatar !== undefined) {
    if (hasAvatar) {
      where.avatarUrl = { not: null };
    }
    else {
      where.avatarUrl = null;
    }
  }

  // Build order by clause
  const orderBy: Prisma.ProfileOrderByWithRelationInput = {};
  if (sortBy === "name" || sortBy === "username") {
    orderBy.user = { [sortBy]: sortOrder };
  }
  else {
    orderBy[sortBy] = sortOrder;
  }

  const [profiles, total] = await Promise.all([
    db.profile.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayUsername: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    }),
    db.profile.count({ where }),
  ]);

  const formattedProfiles = profiles.map(profile => ({
    id: profile.id,
    userId: profile.userId,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    city: profile.city,
    country: profile.country,
    gender: profile.gender,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    user: profile.user,
  }));

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: formattedProfiles, pagination }, HttpStatusCodes.OK);
};

export const searchContests: AppRouteHandler<SearchContests> = async (c) => {
  const {
    page,
    limit,
    query,
    sortBy,
    sortOrder,
    status,
    minPrizePool,
    maxPrizePool,
    startDate,
    endDate,
  } = c.req.valid("query");

  const skip = (page - 1) * limit;
  const take = limit;

  console.log(minPrizePool);

  // Build where clause for filtering
  const where: Prisma.ContestWhereInput = {};

  if (query) {
    where.OR = [
      { name: { contains: query } },
      { description: { contains: query } },
    ];
  }

  if (status) {
    const now = new Date();
    if (status === "active") {
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    }
    else if (status === "upcoming") {
      where.startDate = { gt: now };
    }
    else if (status === "ended") {
      where.endDate = { lt: now };
    }
  }

  if (minPrizePool !== undefined || maxPrizePool !== undefined) {
    where.prizePool = {
      ...(minPrizePool && minPrizePool !== undefined && { gte: minPrizePool }),
      ...(maxPrizePool && maxPrizePool !== undefined && { lte: maxPrizePool }),
    };
  }

  if (startDate) {
    where.startDate = { gte: startDate };
  }

  if (endDate) {
    where.endDate = { lte: endDate };
  }

  // Build order by clause
  const orderBy: Prisma.ContestOrderByWithRelationInput = {};
  orderBy[sortBy] = sortOrder;

  const [contests, total] = await Promise.all([
    db.contest.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    db.contest.count({ where }),
  ]);

  const formattedContests = contests.map((contest) => {
    const now = new Date();
    let status: "active" | "upcoming" | "ended";

    if (contest.startDate > now) {
      status = "upcoming";
    }
    else if (contest.endDate < now) {
      status = "ended";
    }
    else {
      status = "active";
    }

    return {
      id: contest.id,
      name: contest.name,
      description: contest.description,
      startDate: contest.startDate,
      endDate: contest.endDate,
      prizePool: contest.prizePool,
      winnerProfileId: contest.winnerProfileId,
      createdAt: contest.createdAt,
      updatedAt: contest.updatedAt,
      status,
    };
  });

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: formattedContests, pagination }, HttpStatusCodes.OK);
};
