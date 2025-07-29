import { z } from "zod";

// Enum schema for User_Role
export const UserRoleEnum = z.enum(["USER", "ADMIN", "MODERATOR"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

// Zod schema for the User model
export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  emailVerified: z.date().nullable().optional(),

  username: z.string().max(50),
  name: z.string().max(255),

  role: UserRoleEnum.default("USER"),
  isActive: z.boolean().default(true),
  image: z.string().nullable().optional(),
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
