import { z } from "zod";

import { Icon, Notification_Type, User_Role, User_Type } from "@/generated/prisma";

export const AdminNotificationSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  message: z.string(),
  type: z.nativeEnum(Notification_Type),
  icon: z.nativeEnum(Icon).nullable(),
  action: z.string().nullable(),
  isRead: z.boolean(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string().nullable(),
    displayUsername: z.string().nullable(),
    name: z.string(),
    image: z.string().nullable(),
    role: z.nativeEnum(User_Role),
    type: z.nativeEnum(User_Type),
    isActive: z.boolean(),
    createdAt: z.string(),
  }),
  profile: z.object({
    id: z.string(),
    bio: z.string().nullable(),
    instagram: z.string().nullable(),
    tiktok: z.string().nullable(),
  }),
});

export const AdminNotificationsResponseSchema = z.object({
  data: z.array(AdminNotificationSchema),
  pagination: z.object({
    total: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    nextPage: z.number().nullable(),
    previousPage: z.number().nullable(),
  }),
});

export type AdminNotification = z.infer<typeof AdminNotificationSchema>;
export type AdminNotificationsResponse = z.infer<typeof AdminNotificationsResponseSchema>;
