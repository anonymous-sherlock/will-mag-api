import * as HttpStatusCodes from "stoker/http-status-codes";

import type { Prisma } from "@/generated/prisma";
import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { SearchContests, SearchProfiles, SearchUsers } from "./search.routes";

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
      where.coverImageId = { not: null };
    }
    else {
      where.coverImageId = null;
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
        coverImage: {
          select: {
            url: true,
          },
        },
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
    coverImage: profile.coverImage?.url || profile.user.image || null,
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
    search,
  } = c.req.valid("query");

  const skip = (page - 1) * limit;
  const take = limit;

  // Build where clause for filtering
  const where: Prisma.ContestWhereInput = {};

  if (query || search) {
    where.OR = [
      { name: { contains: query || search || "" } },
      { description: { contains: query || search || "" } },
    ];
  }

  if (status) {
    switch (status) {
      case "active":
        where.startDate = { lte: new Date() };
        where.endDate = { gte: new Date() };
        break;
      case "upcoming":
        where.startDate = { gt: new Date() };
        break;
      case "ended":
        where.endDate = { lt: new Date() };
        break;
      case "booked":
        where.status = "BOOKED";
        break;
      case "all":
        break;
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
      include: {

      },
    }),
    db.contest.count({ where }),
  ]);

  // const formattedContests = contests.map((contest) => {
  //   const now = new Date();
  //   let status: "active" | "upcoming" | "ended";

  //   if (contest.startDate > now) {
  //     status = "upcoming";
  //   }
  //   else if (contest.endDate < now) {
  //     status = "ended";
  //   }
  //   else {
  //     status = "active";
  //   }

  //   return {
  //     id: contest.id,
  //     name: contest.name,
  //     description: contest.description,
  //     startDate: contest.startDate,
  //     endDate: contest.endDate,
  //     prizePool: contest.prizePool,
  //     winnerProfileId: contest.winnerProfileId,
  //     createdAt: contest.createdAt,
  //     updatedAt: contest.updatedAt,
  //     status,
  //   };
  // });

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: contests, pagination }, HttpStatusCodes.OK);
};

export const searchUsers: AppRouteHandler<SearchUsers> = async (c) => {
  const { page, limit, query, search, sortBy, sortOrder, role, isActive, hasProfile } = c.req.valid("query");

  const skip = (page - 1) * limit;
  const take = limit;

  // Build where clause for filtering
  const where: Prisma.UserWhereInput = {};

  if (query || search) {
    where.OR = [
      { name: { contains: query || search } },
      { username: { contains: query || search } },
      { displayUsername: { contains: query || search } },
      { email: { contains: query || search } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (hasProfile !== undefined) {
    if (hasProfile) {
      where.profile = { isNot: null };
    }
    else {
      where.profile = null;
    }
  }

  // Build order by clause
  const orderBy: Prisma.UserOrderByWithRelationInput = {};
  switch (sortBy) {
    case "hasProfile":
      orderBy.profile = {
        userId: sortOrder,
      };
      break;

    default:
      orderBy[sortBy] = sortOrder;
      break;
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        profile: {
          select: {
            id: true,
          },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  const formattedUsers = users.map(user => ({
    id: user.id,
    username: user.username,
    displayUsername: user.displayUsername,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    image: user.image,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    hasProfile: user.profile !== null,
  }));

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({ data: formattedUsers, pagination }, HttpStatusCodes.OK);
};
