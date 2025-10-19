import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { updateContestRankings } from "@/lib/contest-ranking";

import type { ContestRanksUpdateRoute, UpdateAllContestRankingsRoute } from "./contest-ranks.routes";

export const contestRanksUpdate: AppRouteHandler<ContestRanksUpdateRoute> = async (c) => {
  const { contestId } = c.req.valid("param");

  try {
    await updateContestRankings(contestId);

    return c.json(
      {
        message: "Contest rankings updated successfully",
        contestId,
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error updating contest rankings:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to update contest rankings");
  }
};
export const updateAllContestRankings: AppRouteHandler<UpdateAllContestRankingsRoute> = async (c) => {
  try {
    const contests = await db.contest.findMany({
      where: {
        status: { in: ["PUBLISHED", "ACTIVE", "VOTING", "JUDGING", "BOOKED"] },
        contestParticipations: {
          some: {},
        },
      },
      select: { id: true }, // Only select the id field
    });

    // Process contests in parallel with concurrency limit
    const BATCH_SIZE = 5;
    const results = [];

    for (let i = 0; i < contests.length; i += BATCH_SIZE) {
      const batch = contests.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((contest) =>
        updateContestRankings(contest.id).catch((error) => ({
          contestId: contest.id,
          error: error.message,
        }))
      );

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }

    const failedUpdates = results.filter((result) => result.status === "rejected" || (result.status === "fulfilled" && result.value && result.value.error));

    if (failedUpdates.length > 0) {
      console.warn(`Failed to update ${failedUpdates.length} contest rankings`);
    }

    return c.json(
      {
        message: "All contest rankings updated successfully",
        totalContests: contests.length,
        failedUpdates: failedUpdates.length,
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Error updating all contest rankings:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to update all contest rankings");
  }
};
