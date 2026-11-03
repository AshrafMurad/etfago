"use server";

import { requireAuth } from "../auth/session";
import { UpdateNotificationPreferencesSchema } from "../../lib/schemas/settings";
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  UserNotificationPreferences,
} from "../notifications/preferences";
import { revalidatePath } from "next/cache";

export type SettingsActionState = {
  success?: boolean;
  error?: string;
  preferences?: UserNotificationPreferences;
};

export async function getPreferencesAction(): Promise<UserNotificationPreferences> {
  const actor = await requireAuth();
  return getUserNotificationPreferences(actor.id);
}

export async function updatePreferencesAction(
  _prevState: SettingsActionState | null,
  formData: FormData
): Promise<SettingsActionState> {
  const actor = await requireAuth();

  const reviewRemindersRaw = formData.get("reviewReminders");
  const commitmentRemindersRaw = formData.get("commitmentReminders");

  const rawData = {
    reviewReminders: reviewRemindersRaw === "true" || reviewRemindersRaw === "on",
    commitmentReminders: commitmentRemindersRaw === "true" || commitmentRemindersRaw === "on",
  };

  const parsed = UpdateNotificationPreferencesSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid settings format",
    };
  }

  try {
    const updated = await updateUserNotificationPreferences(actor.id, parsed.data);
    revalidatePath("/[locale]/settings", "page");
    return {
      success: true,
      preferences: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update preferences";
    return {
      success: false,
      error: message,
    };
  }
}
