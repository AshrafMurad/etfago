import { db } from "../db/prisma";
import {
  NotificationPreferencesInput,
  UpdateNotificationPreferencesInput,
  NotificationPreferencesSchema,
} from "../../lib/schemas/settings";

export interface UserNotificationPreferences {
  reviewReminders: boolean;
  commitmentReminders: boolean;
}

/**
 * Returns user's notification preferences. If user has no record, defaults to enabled (true).
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<UserNotificationPreferences> {
  const record = await db.notificationPreference.findUnique({
    where: { userId },
  });

  if (!record) {
    return {
      reviewReminders: true,
      commitmentReminders: true,
    };
  }

  return {
    reviewReminders: record.reviewReminders,
    commitmentReminders: record.commitmentReminders,
  };
}

/**
 * Updates or creates user's notification preferences.
 */
export async function updateUserNotificationPreferences(
  userId: string,
  input: UpdateNotificationPreferencesInput
): Promise<UserNotificationPreferences> {
  const current = await getUserNotificationPreferences(userId);

  const updatedData: NotificationPreferencesInput = {
    reviewReminders:
      input.reviewReminders !== undefined ? input.reviewReminders : current.reviewReminders,
    commitmentReminders:
      input.commitmentReminders !== undefined
        ? input.commitmentReminders
        : current.commitmentReminders,
  };

  NotificationPreferencesSchema.parse(updatedData);

  const updated = await db.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      reviewReminders: updatedData.reviewReminders,
      commitmentReminders: updatedData.commitmentReminders,
    },
    update: {
      reviewReminders: updatedData.reviewReminders,
      commitmentReminders: updatedData.commitmentReminders,
    },
  });

  return {
    reviewReminders: updated.reviewReminders,
    commitmentReminders: updated.commitmentReminders,
  };
}
