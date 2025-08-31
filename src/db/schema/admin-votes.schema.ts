import { z } from "zod";

import { Payment_Status } from "@/generated/prisma";

export const AdminVoteSchema = z.object({
  id: z.string(),
  type: z.enum(["FREE", "PAID"]),
  count: z.number(),
  comment: z.string().nullable(),
  createdAt: z.string(),
  contest: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  voter: z.object({
    id: z.string(),
    username: z.string(),
    name: z.string(),
    profilePicture: z.string(),
  }),
  votee: z.object({
    id: z.string(),
    username: z.string(),
    name: z.string(),
    profilePicture: z.string(),
  }),
  payment: z.object({
    id: z.string(),
    amount: z.number(),
    status: z.nativeEnum(Payment_Status),
  }).nullable(),
});

export const AdminVotesResponseSchema = z.object({
  data: z.array(AdminVoteSchema),
  pagination: z.object({
    total: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    nextPage: z.number().nullable(),
    previousPage: z.number().nullable(),
  }),
});

export type AdminVote = z.infer<typeof AdminVoteSchema>;
export type AdminVotesResponse = z.infer<typeof AdminVotesResponseSchema>;
