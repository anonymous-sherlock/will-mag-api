import { z } from "zod";

import type { User as PrismaUser } from "@/generated/prisma/index";

import { User_Role } from "@/generated/prisma/index";
// Use Prisma's generated enum
export const UserRoleEnum = z.nativeEnum(User_Role);
export type UserRole = z.infer<typeof UserRoleEnum>;

// Zod schema for the User model
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  username: z.string().max(100).nullable(),
  displayUsername: z.string().nullable(),
  name: z.string(),
  role: UserRoleEnum,
  isActive: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),

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
