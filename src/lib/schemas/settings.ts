import { z } from "zod";

export const NotificationPreferencesSchema = z.object({
  reviewReminders: z.boolean().default(true),
  commitmentReminders: z.boolean().default(true),
});

export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>;

export const UpdateNotificationPreferencesSchema = z.object({
  reviewReminders: z.boolean().optional(),
  commitmentReminders: z.boolean().optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof UpdateNotificationPreferencesSchema>;
