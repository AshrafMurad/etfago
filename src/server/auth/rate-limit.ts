import crypto from "node:crypto";
import { db } from "../db/prisma";

// Persistent atomic counters work across process restarts. Store hashes, not addresses.
export async function consumeAuthRateLimit(scope: string, identity: string, limit: number, windowMs = 3600000): Promise<boolean> {
  const key = crypto.createHash("sha256").update(`${scope}:${identity}`).digest("hex");
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const rows = await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "AuthRateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthRateLimit"."resetAt" <= ${now} THEN 1 ELSE "AuthRateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "AuthRateLimit"."resetAt" <= ${now} THEN ${resetAt} ELSE "AuthRateLimit"."resetAt" END
    RETURNING "count"
  `;
  return rows[0].count <= limit;
}
