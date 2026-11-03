import { NextRequest, NextResponse } from "next/server";
import { runNotificationCycle } from "@/server/notifications/cycle";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const expected = `Bearer ${cronSecret}`;
    if (!authHeader || authHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const report = await runNotificationCycle();
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Cron Reminders API] Error during notification cycle:", message);
    return NextResponse.json(
      { success: false, error: "Internal error processing reminders" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
