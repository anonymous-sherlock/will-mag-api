import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import { UnauthorizedResponse } from "@/lib/openapi.responses";

const tags = ["Analytics"];

export const getDashboardStats = createRoute({
  path: "/analytics/dashboard",
  method: "get",
  tags,
  summary: "Get Dashboard Statistics",
  description: "Get comprehensive statistics for admin dashboard including total competitions, users, votes, prize pool, and onboarded users",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        totalCompetitions: z.number().describe("Total number of competitions"),
        totalUsers: z.number().describe("Total number of users"),
        totalVotes: z.number().describe("Total number of votes cast"),
        totalPrizePool: z.number().describe("Total prize pool across all competitions"),
        totalOnboardedUsers: z.number().describe("Total number of users with profiles (onboarded)"),
        freeVotes: z.number().describe("Total number of free votes"),
        paidVotes: z.number().describe("Total number of paid votes"),
        activeCompetitions: z.number().describe("Number of active competitions"),
        completedCompetitions: z.number().describe("Number of completed competitions"),
        totalParticipants: z.number().describe("Total number of contest participants"),
        totalRevenue: z.number().describe("Total revenue from paid votes"),
      }),
      "Admin dashboard statistics",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
  },
});

export const getDetailedAnalytics = createRoute({
  path: "/analytics/detailed",
  method: "get",
  tags,
  summary: "Get Detailed Analytics",
  description: "Get detailed analytics with time-based data and breakdowns",
  request: {
    query: z.object({
      period: z.enum(["7d", "30d", "90d", "1y", "all"]).optional().default("30d").describe("Time period for analytics"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        period: z.string(),
        userGrowth: z.object({
          total: z.number(),
          newThisPeriod: z.number(),
          growthRate: z.number(),
        }),
        voteActivity: z.object({
          total: z.number(),
          thisPeriod: z.number(),
          averagePerDay: z.number(),
          freeVotes: z.number(),
          paidVotes: z.number(),
        }),
        competitionMetrics: z.object({
          total: z.number(),
          active: z.number(),
          completed: z.number(),
          averagePrizePool: z.number(),
          totalPrizePool: z.number(),
        }),
        revenueMetrics: z.object({
          total: z.number(),
          thisPeriod: z.number(),
          averagePerVote: z.number(),
          conversionRate: z.number(),
        }),
        participationMetrics: z.object({
          totalParticipants: z.number(),
          activeParticipants: z.number(),
          averageParticipationRate: z.number(),
        }),
      }),
      "Detailed analytics data",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
  },
});

export const getContestAnalytics = createRoute({
  path: "/analytics/contests",
  method: "get",
  tags,
  summary: "Get Contest Analytics",
  description: "Get contest-specific analytics including total, active, upcoming contests and prize pool",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        total: z.number().describe("Total number of contests"),
        active: z.number().describe("Number of active contests"),
        upcoming: z.number().describe("Number of upcoming contests"),
        prizePool: z.number().describe("Total prize pool across all contests"),
      }),
      "Contest analytics data",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
  },
});

export type GetDashboardStatsRoute = typeof getDashboardStats;
export type GetDetailedAnalyticsRoute = typeof getDetailedAnalytics;
export type GetContestAnalyticsRoute = typeof getContestAnalytics;
