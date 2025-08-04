import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";
import { getActiveVoteMultiplierPeriod } from "@/lib/vote-multiplier";

import type {
  createVoteMultiplierPeriod as CreateVoteMultiplierPeriod,
  deleteVoteMultiplierPeriod as DeleteVoteMultiplierPeriod,
  getActiveVoteMultiplier as GetActiveVoteMultiplier,
  getVoteMultiplierPeriods as GetVoteMultiplierPeriods,
  updateVoteMultiplierPeriod as UpdateVoteMultiplierPeriod,
} from "./vote-multiplier.routes";

export const createVoteMultiplierPeriod: AppRouteHandler<typeof CreateVoteMultiplierPeriod> = async (c) => {
  const data = c.req.valid("json");

  // Validate that endTime is after startTime
  if (new Date(data.endTime) <= new Date(data.startTime)) {
    return sendErrorResponse(c, "badRequest", "End time must be after start time");
  }

  // Check for overlapping periods
  const overlappingPeriod = await db.voteMultiplierPeriod.findFirst({
    where: {
      isActive: true,
      OR: [
        {
          startTime: {
            lte: new Date(data.endTime),
          },
          endTime: {
            gte: new Date(data.startTime),
          },
        },
      ],
    },
  });

  if (overlappingPeriod) {
    return sendErrorResponse(c, "conflict", "A vote multiplier period already exists for this time range");
  }

  const voteMultiplierPeriod = await db.voteMultiplierPeriod.create({
    data: {
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      multiplierTimes: data.multiplierTimes,
      isActive: data.isActive,
    },
  });

  return c.json(voteMultiplierPeriod, HttpStatusCodes.CREATED);
};

export const getVoteMultiplierPeriods: AppRouteHandler<typeof GetVoteMultiplierPeriods> = async (c) => {
  const { page, limit } = c.req.valid("query");

  const [voteMultiplierPeriods, total] = await Promise.all([
    db.voteMultiplierPeriod.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.voteMultiplierPeriod.count(),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: voteMultiplierPeriods,
    pagination,
  }, HttpStatusCodes.OK);
};

export const getActiveVoteMultiplier: AppRouteHandler<typeof GetActiveVoteMultiplier> = async (c) => {
  const activeMultiplier = await getActiveVoteMultiplierPeriod();
  return c.json(activeMultiplier, HttpStatusCodes.OK);
};

export const updateVoteMultiplierPeriod: AppRouteHandler<typeof UpdateVoteMultiplierPeriod> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");

  const existingPeriod = await db.voteMultiplierPeriod.findUnique({
    where: { id },
  });

  if (!existingPeriod) {
    return sendErrorResponse(c, "notFound", "Vote multiplier period not found");
  }

  // Validate that endTime is after startTime if both are provided
  if (data.startTime && data.endTime && new Date(data.endTime) <= new Date(data.startTime)) {
    return sendErrorResponse(c, "badRequest", "End time must be after start time");
  }

  // Check for overlapping periods (excluding the current period)
  if (data.startTime || data.endTime) {
    const startTime = data.startTime ? new Date(data.startTime) : existingPeriod.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : existingPeriod.endTime;

    const overlappingPeriod = await db.voteMultiplierPeriod.findFirst({
      where: {
        id: {
          not: id,
        },
        isActive: true,
        OR: [
          {
            startTime: {
              lte: endTime,
            },
            endTime: {
              gte: startTime,
            },
          },
        ],
      },
    });

    if (overlappingPeriod) {
      return sendErrorResponse(c, "conflict", "A vote multiplier period already exists for this time range");
    }
  }

  const updatedPeriod = await db.voteMultiplierPeriod.update({
    where: { id },
    data: {
      ...(data.startTime && { startTime: new Date(data.startTime) }),
      ...(data.endTime && { endTime: new Date(data.endTime) }),
      ...(data.multiplierTimes && { multiplierTimes: data.multiplierTimes }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  return c.json(updatedPeriod, HttpStatusCodes.OK);
};

export const deleteVoteMultiplierPeriod: AppRouteHandler<typeof DeleteVoteMultiplierPeriod> = async (c) => {
  const { id } = c.req.valid("param");

  const existingPeriod = await db.voteMultiplierPeriod.findUnique({
    where: { id },
  });

  if (!existingPeriod) {
    // Always return 200 with a message, not a 404
    return sendErrorResponse(c, "notFound", "Vote multiplier period not found");
  }

  await db.voteMultiplierPeriod.delete({
    where: { id },
  });

  return c.json({ message: "Vote multiplier deleted successfully" }, HttpStatusCodes.OK);
};
