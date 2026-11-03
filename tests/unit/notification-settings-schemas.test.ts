import { describe, it, expect } from "vitest";
import {
  NotificationPreferencesSchema,
  UpdateNotificationPreferencesSchema,
} from "../../src/lib/schemas/settings";

describe("Sprint 9 Unit: Notification Preferences Schemas", () => {
  it("defaults both review and commitment reminders to true", () => {
    const parsed = NotificationPreferencesSchema.parse({});
    expect(parsed.reviewReminders).toBe(true);
    expect(parsed.commitmentReminders).toBe(true);
  });

  it("accepts valid explicit boolean preferences", () => {
    const parsed = NotificationPreferencesSchema.parse({
      reviewReminders: false,
      commitmentReminders: true,
    });
    expect(parsed.reviewReminders).toBe(false);
    expect(parsed.commitmentReminders).toBe(true);
  });

  it("validates partial preference updates", () => {
    const update1 = UpdateNotificationPreferencesSchema.parse({
      reviewReminders: false,
    });
    expect(update1.reviewReminders).toBe(false);
    expect(update1.commitmentReminders).toBeUndefined();

    const update2 = UpdateNotificationPreferencesSchema.parse({
      commitmentReminders: false,
    });
    expect(update2.commitmentReminders).toBe(false);
    expect(update2.reviewReminders).toBeUndefined();
  });

  it("rejects non-boolean types", () => {
    expect(() =>
      UpdateNotificationPreferencesSchema.parse({
        reviewReminders: "not-a-bool" as unknown as boolean,
      })
    ).toThrow();
  });
});
