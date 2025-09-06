import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { sendErrorResponse } from "@/helpers/send-error-response";
import { recalculateAllProfileStats, recalculateProfileStats } from "@/lib/profile-stats";

import type { RecalculateAllStatsRoute, RecalculateProfileStatsByIdRoute } from "./profile-stats.routes";

export const recalculateAllStats: AppRouteHandler<RecalculateAllStatsRoute> = async (c) => {
  try {
    // console.log("🔄 Starting ProfileStats recalculation...");

    const results = await recalculateAllProfileStats();

    const totalFreeVotes = results.reduce((sum, r) => sum + r.freeVotes, 0);
    const totalPaidVotes = results.reduce((sum, r) => sum + r.paidVotes, 0);
    const totalWeightedScore = results.reduce((sum, r) => sum + r.weightedScore, 0);

    return c.json({
      success: true,
      message: `Successfully recalculated ProfileStats for ${results.length} profiles`,
      summary: {
        profilesProcessed: results.length,
        totalFreeVotes,
        totalPaidVotes,
        totalWeightedScore,
      },
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Error recalculating ProfileStats:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to recalculate ProfileStats");
  }
};

export const recalculateProfileStatsById: AppRouteHandler<RecalculateProfileStatsByIdRoute> = async (c) => {
  const { profileId } = c.req.param();

  if (!profileId) {
    return sendErrorResponse(c, "badRequest", "Profile ID is required");
  }

  try {
    const stats = await recalculateProfileStats(profileId);

    return c.json({
      success: true,
      message: `Successfully recalculated ProfileStats for profile ${profileId}`,
      stats,
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Error recalculating ProfileStats:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to recalculate ProfileStats");
  }
};
