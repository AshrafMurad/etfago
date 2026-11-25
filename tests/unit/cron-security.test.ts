import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const cycle = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("../../src/server/notifications/cycle", () => ({ runNotificationCycle: cycle }));
import { POST } from "../../src/app/api/cron/reminders/route";

afterEach(() => { vi.unstubAllEnvs(); cycle.mockClear(); });
it("denies cron dispatch when the secret is missing or incorrect", async () => {
  vi.stubEnv("CRON_SECRET", "");
  expect((await POST(new NextRequest("https://etfago.test/api/cron/reminders"))).status).toBe(503);
  vi.stubEnv("CRON_SECRET", "configured-secret");
  expect((await POST(new NextRequest("https://etfago.test/api/cron/reminders"))).status).toBe(401);
  expect(cycle).not.toHaveBeenCalled();
});
