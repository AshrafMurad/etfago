import { NextResponse } from "next/server";
import { db } from "@/server/db/prisma";
import { verifyStorageWritable } from "@/server/storage/filesystem";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    verifyStorageWritable();
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
