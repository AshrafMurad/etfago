import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../server/auth/session";
import { saveAttachment } from "../../../../../server/storage/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: agreementId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const versionId = (formData.get("versionId") as string) || null;

    if (!file) {
      return NextResponse.json(
        { error: "No file was uploaded" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const attachment = await saveAttachment(
      user.id,
      agreementId,
      buffer,
      file.name,
      versionId
    );

    return NextResponse.json({ success: true, attachment });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to upload file";
    const status =
      msg.includes("not found") ? 404 : msg.includes("exceeded") || msg.includes("Unsupported") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
