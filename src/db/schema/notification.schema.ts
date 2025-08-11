import { z } from "zod";

import type { Notification } from "@/generated/prisma/index.js";

import { Icon } from "@/generated/prisma/index.js";

export const IconSchema = z.nativeEnum(Icon);

export const NotificationSchema = z.object({
  id: z.string(),
  message: z.string(),
  userId: z.string(),
  profileId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isRead: z.boolean(),
  archived: z.boolean(),
  icon: IconSchema.nullable(),
  action: z.string().nullable(),
}) satisfies z.ZodType<Notification>;

export const NotificationInsertSchema = NotificationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isRead: true,
  archived: true,
}).extend({
  icon: IconSchema.optional(),
  action: z.string().optional(),
});

export const NotificationUpdateSchema = NotificationSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
}).extend({
  isRead: z.boolean().default(false),
  archived: z.boolean().default(false),
});

export const NotificationSelectSchema = NotificationSchema;

export const NotificationListSchema = z.object({
  notifications: z.array(NotificationSelectSchema),
});

export type NotificationInsert = z.infer<typeof NotificationInsertSchema>;
export type NotificationUpdate = z.infer<typeof NotificationUpdateSchema>;
export type NotificationSelect = z.infer<typeof NotificationSelectSchema>;
export type NotificationList = z.infer<typeof NotificationListSchema>;
