import z from "zod";

export const LeaderboardEntrySchema = z.object({
  rank: z.number().openapi({ example: 1 }),
  profileId: z.string().openapi({ example: "clx1234567890abcdef" }),
  userId: z.string().openapi({ example: "clx1234567890abcdef" }),
  username: z.string().openapi({ example: "john_doe" }),
  displayUsername: z.string().nullable().openapi({ example: "John Doe" }),
  coverImage: z.string().nullable().openapi({ example: "https://example.com/avatar.jpg" }),
  bio: z.string().nullable().openapi({ example: "Model and influencer" }),
  totalVotes: z.number().openapi({ example: 150 }),
  freeVotes: z.number().openapi({ example: 100 }),
  paidVotes: z.number().openapi({ example: 50 }),
  createdAt: z.date().openapi({ example: "2024-01-01T00:00:00Z" }),
});

export const LeaderboardSelectSchema = LeaderboardEntrySchema;

export const LeaderboardStatsSchema = z.object({
  totalModels: z.coerce.number(),
  totalVotes: z.coerce.number(),
  activeContests: z.coerce.number(),
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
