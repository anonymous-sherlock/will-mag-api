import { z } from "zod";

import type { User as PrismaUser } from "@/generated/prisma/index.js";

import { User_Role } from "@/generated/prisma/index.js";

export const UserRoleEnum = z.nativeEnum(User_Role);
export type UserRole = z.infer<typeof UserRoleEnum>;

// Zod schema for the User model
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email().openapi({ example: "alex@example.com" }),
  emailVerified: z.boolean().openapi({ example: true }),
  username: z.string().max(100).nullable().openapi({ example: "alex_1" }),
  displayUsername: z.string().nullable().openapi({ example: "Alex" }),
  name: z.string().openapi({ example: "Alex" }),
  role: UserRoleEnum.openapi({ example: User_Role.USER }),
  isActive: z.boolean().openapi({ example: true }),
  image: z.string().nullable().openapi({ example: "https://example.com/avatar.png" }),
  createdAt: z.date().openapi({ example: "2025-08-02T12:34:56.000Z" }),
  updatedAt: z.date().openapi({ example: "2025-08-02T12:34:56.000Z" }),
}) satisfies z.ZodType<PrismaUser>;

export const UserInsertSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  emailVerified: true,
  displayUsername: true,
}).extend({
  password: z.string().min(6),
  username: z.string().min(3).max(100),
});

export type User = z.infer<typeof UserSchema>;

export const UserSelectSchema = UserSchema;
