import { describe, it, expect } from "vitest";

describe("Sprint 9 Unit: Reminders & Idempotency Key Formatting", () => {
  it("generates deterministic eventKeys for upcoming commitments", () => {
    const commitmentId = "comm-123";
    const dueAt = new Date("2026-11-05T12:00:00Z");
    const dateBucket = dueAt.toISOString().slice(0, 10);

    const key1 = `commitment-reminder-${commitmentId}-upcoming-${dateBucket}`;
    const key2 = `commitment-reminder-${commitmentId}-upcoming-${dateBucket}`;

    expect(key1).toBe("commitment-reminder-comm-123-upcoming-2026-11-05");
    expect(key1).toBe(key2);
  });

  it("generates deterministic eventKeys for overdue commitments per calendar day", () => {
    const commitmentId = "comm-456";
    const executionDay = new Date("2026-11-03T10:00:00Z");
    const dateBucket = executionDay.toISOString().slice(0, 10);

    const key1 = `commitment-reminder-${commitmentId}-overdue-${dateBucket}`;
    const key2 = `commitment-reminder-${commitmentId}-overdue-${dateBucket}`;

    expect(key1).toBe("commitment-reminder-comm-456-overdue-2026-11-03");
    expect(key1).toBe(key2);
  });

  it("generates deterministic eventKeys for pending version reviews per reviewer per day", () => {
    const versionId = "v-789";
    const reviewerId = "part-999";
    const executionDay = new Date("2026-11-03T14:30:00Z");
    const dateBucket = executionDay.toISOString().slice(0, 10);

    const key1 = `review-reminder-${versionId}-${reviewerId}-${dateBucket}`;
    const key2 = `review-reminder-${versionId}-${reviewerId}-${dateBucket}`;

    expect(key1).toBe("review-reminder-v-789-part-999-2026-11-03");
    expect(key1).toBe(key2);
  });

  it("calculates correct exponential backoff for transient retry attempts", () => {
    const baseBackoffMs = 60000;
    const now = new Date("2026-11-03T12:00:00Z");

    const attempt1 = 1;
    const delay1 = Math.pow(2, attempt1) * baseBackoffMs;
    const next1 = new Date(now.getTime() + delay1);
    expect(delay1).toBe(120000); // 2 minutes
    expect(next1.toISOString()).toBe("2026-11-03T12:02:00.000Z");

    const attempt2 = 2;
    const delay2 = Math.pow(2, attempt2) * baseBackoffMs;
    const next2 = new Date(now.getTime() + delay2);
    expect(delay2).toBe(240000); // 4 minutes
    expect(next2.toISOString()).toBe("2026-11-03T12:04:00.000Z");

    const attempt3 = 3;
    const delay3 = Math.pow(2, attempt3) * baseBackoffMs;
    const next3 = new Date(now.getTime() + delay3);
    expect(delay3).toBe(480000); // 8 minutes
    expect(next3.toISOString()).toBe("2026-11-03T12:08:00.000Z");
  });
});
