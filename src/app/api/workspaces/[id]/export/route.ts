import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../server/auth/session";
import {
  getWorkspaceOperationalReport,
  generateWorkspaceCsvReport,
  generateWorkspaceJsonReport,
} from "../../../../../server/workspaces/reporting";
import { ForbiddenError, NotFoundError } from "../../../../../lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "json" ? "json" : "csv";

  try {
    const report = await getWorkspaceOperationalReport(user.id, workspaceId);

    const safeFilenamePart = report.workspace.name
      .trim()
      .replace(/[\s/\\?%*:|"<>]+/g, "-");

    if (format === "json") {
      const jsonContent = generateWorkspaceJsonReport(report);
      const filename = `workspace-report-${safeFilenamePart}.json`;
      const encodedFilename = encodeURIComponent(filename);

      return new Response(jsonContent, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodedFilename}`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const csvContent = generateWorkspaceCsvReport(report);
    const filename = `workspace-report-${safeFilenamePart}.csv`;
    const encodedFilename = encodeURIComponent(filename);

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodedFilename}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Failed to generate report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
