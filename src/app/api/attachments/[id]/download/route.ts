import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import { getCurrentUser } from "../../../../../server/auth/session";
import { getAttachmentForDownload } from "../../../../../server/storage/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: attachmentId } = await params;

  try {
    const { attachment, filePath } = await getAttachmentForDownload(
      user.id,
      attachmentId
    );

    const stat = fs.statSync(filePath);
    const nodeStream = fs.createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream);

    const safeAsciiName = attachment.originalFilename.replace(/[^\x20-\x7E]/g, "_");
    const encodedUtf8Name = encodeURIComponent(attachment.originalFilename);

    return new Response(webStream as ReadableStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodedUtf8Name}`,
        "Content-Length": String(stat.size),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Download failed";
    const status = msg.includes("not found") ? 404 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
}
