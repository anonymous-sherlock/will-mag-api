import { z } from "zod";

// Enum schema for User_Role
export const UserRoleEnum = z.enum(["USER", "ADMIN", "MODERATOR"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

// Zod schema for the User model
export const UserSchema = z.object({
  id: z.number().int().nonnegative(),
  email: z.string().email(),
  emailVerified: z.date().nullable().optional(),

  username: z.string().max(50),
  firstName: z.string().max(100),
  lastName: z.string().max(100).nullable().optional(),

  role: UserRoleEnum.default("USER"),
  isActive: z.boolean().default(true),

  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export const UserInsertSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  emailVerified: true,

});

export type User = z.infer<typeof UserSchema>;

export const UserSelectSchema = UserSchema;
