import { db } from "../db/prisma";
import { assertCanViewWorkspace } from "../auth/permissions";
import { DraftContentSchema } from "../../lib/schemas/agreements";

export interface AgreementReportItem {
  id: string;
  title: string;
  lifecycleStatus: string;
  organizerName: string;
  organizerEmail: string;
  currentApprovedVersionNumber: number | null;
  termsCount: number;
  openCommitmentsCount: number;
  overdueCommitmentsCount: number;
  pendingReview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommitmentReportItem {
  id: string;
  agreementId: string;
  agreementTitle: string;
  title: string;
  assigneeName: string | null;
  assigneeEmail: string | null;
  status: string;
  dueAt: Date | null;
  isOverdue: boolean;
  needsReview: boolean;
  createdAt: Date;
}

export interface ActivityReportItem {
  id: string;
  agreementId: string;
  agreementTitle: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  createdAt: Date;
}

export interface WorkspaceOperationalReport {
  workspace: {
    id: string;
    name: string;
    kind: "PERSONAL" | "BUSINESS";
    ownerUserId: string;
    memberCount: number;
    createdAt: Date;
  };
  metrics: {
    agreements: {
      total: number;
      draft: number;
      agreed: number;
      active: number;
      completed: number;
      cancelled: number;
      archived: number;
      pendingReview: number;
    };
    commitments: {
      total: number;
      todo: number;
      inProgress: number;
      done: number;
      cancelled: number;
      overdue: number;
      needsReview: number;
      completionRate: number; // 0 to 100 percentage
    };
    members: {
      total: number;
      owners: number;
      admins: number;
      regularMembers: number;
    };
  };
  agreements: AgreementReportItem[];
  commitments: CommitmentReportItem[];
  recentActivity: ActivityReportItem[];
  generatedAt: Date;
}

/**
 * Compiles a comprehensive operational report for a workspace.
 * Requires active workspace membership.
 */
export async function getWorkspaceOperationalReport(
  actorUserId: string,
  workspaceId: string
): Promise<WorkspaceOperationalReport> {
  await assertCanViewWorkspace(actorUserId, workspaceId);

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        where: { removedAt: null },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              emailNormalized: true,
            },
          },
        },
      },
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  // Fetch all agreements for this workspace (including archived ones for historical count)
  const agreements = await db.agreement.findMany({
    where: { workspaceId },
    include: {
      participants: {
        where: { removedAt: null },
        select: {
          id: true,
          partyDisplayName: true,
          emailNormalized: true,
          userId: true,
          agreementRole: true,
        },
      },
      versions: {
        select: {
          id: true,
          versionNumber: true,
        },
      },
      draft: {
        select: {
          contentJson: true,
        },
      },
      commitments: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const now = new Date();

  // Metrics aggregation
  let draftCount = 0;
  let agreedCount = 0;
  let activeCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let archivedCount = 0;
  let pendingReviewCount = 0;

  let totalCommitments = 0;
  let todoCount = 0;
  let inProgressCount = 0;
  let doneCount = 0;
  let cancelledCommitmentsCount = 0;
  let overdueCount = 0;
  let needsReviewCount = 0;

  const agreementReportItems: AgreementReportItem[] = [];
  const commitmentReportItems: CommitmentReportItem[] = [];

  for (const ag of agreements) {
    if (ag.archivedAt) {
      archivedCount++;
    } else {
      switch (ag.lifecycleStatus) {
        case "DRAFT":
          draftCount++;
          break;
        case "AGREED":
          agreedCount++;
          break;
        case "ACTIVE":
          activeCount++;
          break;
        case "COMPLETED":
          completedCount++;
          break;
        case "CANCELLED":
          cancelledCount++;
          break;
      }
    }

    if (ag.pendingReviewVersionId) {
      pendingReviewCount++;
    }

    let termsCount = 0;
    if (ag.draft?.contentJson) {
      const parsed = DraftContentSchema.safeParse(ag.draft.contentJson);
      if (parsed.success) {
        termsCount = parsed.data.terms.length;
      }
    }

    let openAgreementCommitments = 0;
    let overdueAgreementCommitments = 0;

    for (const comm of ag.commitments) {
      totalCommitments++;

      const isOverdue =
        (comm.status === "TODO" || comm.status === "IN_PROGRESS") &&
        comm.dueAt !== null &&
        comm.dueAt < now;

      if (isOverdue) {
        overdueCount++;
        overdueAgreementCommitments++;
      }

      if (comm.needsReview && comm.status !== "CANCELLED") {
        needsReviewCount++;
      }

      switch (comm.status) {
        case "TODO":
          todoCount++;
          openAgreementCommitments++;
          break;
        case "IN_PROGRESS":
          inProgressCount++;
          openAgreementCommitments++;
          break;
        case "DONE":
          doneCount++;
          break;
        case "CANCELLED":
          cancelledCommitmentsCount++;
          break;
      }

      const assignee = comm.assigneeParticipantId
        ? ag.participants.find((p) => p.id === comm.assigneeParticipantId)
        : null;

      commitmentReportItems.push({
        id: comm.id,
        agreementId: ag.id,
        agreementTitle: ag.title,
        title: comm.title,
        assigneeName: assignee?.partyDisplayName ?? null,
        assigneeEmail: assignee?.emailNormalized ?? null,
        status: comm.status,
        dueAt: comm.dueAt,
        isOverdue,
        needsReview: comm.needsReview,
        createdAt: comm.createdAt,
      });
    }

    const organizerParticipant =
      ag.participants.find(
        (p) => p.userId === ag.organizerUserId || p.agreementRole === "ORGANIZER"
      ) || ag.participants[0];
    const currentApprovedVersion = ag.currentApprovedVersionId
      ? ag.versions.find((v) => v.id === ag.currentApprovedVersionId)
      : null;

    agreementReportItems.push({
      id: ag.id,
      title: ag.title,
      lifecycleStatus: ag.archivedAt ? "ARCHIVED" : ag.lifecycleStatus,
      organizerName: organizerParticipant?.partyDisplayName || "Unknown",
      organizerEmail: organizerParticipant?.emailNormalized || "",
      currentApprovedVersionNumber: currentApprovedVersion?.versionNumber ?? null,
      termsCount,
      openCommitmentsCount: openAgreementCommitments,
      overdueCommitmentsCount: overdueAgreementCommitments,
      pendingReview: !!ag.pendingReviewVersionId,
      createdAt: ag.createdAt,
      updatedAt: ag.updatedAt,
    });
  }

  // Calculate completion rate: done / (total - cancelled) * 100
  const activeCommitmentsTotal = totalCommitments - cancelledCommitmentsCount;
  const completionRate =
    activeCommitmentsTotal > 0 ? Math.round((doneCount / activeCommitmentsTotal) * 100) : 0;

  // Member statistics
  let ownersCount = 0;
  let adminsCount = 0;
  let regularMembersCount = 0;

  for (const m of workspace.members) {
    if (m.role === "OWNER") ownersCount++;
    else if (m.role === "ADMIN") adminsCount++;
    else regularMembersCount++;
  }

  // Fetch recent activity events across agreements in this workspace
  const recentActivityEvents = await db.activityEvent.findMany({
    where: {
      agreement: {
        workspaceId,
      },
    },
    include: {
      agreement: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const actorUserIds = Array.from(
    new Set(
      recentActivityEvents
        .map((e) => e.actorUserId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const actorUsers =
    actorUserIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: actorUserIds } },
          select: { id: true, name: true, emailNormalized: true },
        })
      : [];

  const actorMap = new Map(actorUsers.map((u) => [u.id, u]));

  const recentActivity: ActivityReportItem[] = recentActivityEvents.map((e) => {
    const actor = e.actorUserId ? actorMap.get(e.actorUserId) : null;
    return {
      id: e.id,
      agreementId: e.agreement.id,
      agreementTitle: e.agreement.title,
      actorName: actor?.name ?? null,
      actorEmail: actor?.emailNormalized ?? null,
      action: e.action,
      createdAt: e.createdAt,
    };
  });

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      kind: workspace.kind,
      ownerUserId: workspace.ownerUserId,
      memberCount: workspace.members.length,
      createdAt: workspace.createdAt,
    },
    metrics: {
      agreements: {
        total: agreements.length,
        draft: draftCount,
        agreed: agreedCount,
        active: activeCount,
        completed: completedCount,
        cancelled: cancelledCount,
        archived: archivedCount,
        pendingReview: pendingReviewCount,
      },
      commitments: {
        total: totalCommitments,
        todo: todoCount,
        inProgress: inProgressCount,
        done: doneCount,
        cancelled: cancelledCommitmentsCount,
        overdue: overdueCount,
        needsReview: needsReviewCount,
        completionRate,
      },
      members: {
        total: workspace.members.length,
        owners: ownersCount,
        admins: adminsCount,
        regularMembers: regularMembersCount,
      },
    },
    agreements: agreementReportItems,
    commitments: commitmentReportItems,
    recentActivity,
    generatedAt: now,
  };
}

/**
 * Escapes a cell value for safe RFC 4180 CSV output.
 */
function escapeCsv(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Formats a WorkspaceOperationalReport into standard CSV format with UTF-8 BOM.
 */
export function generateWorkspaceCsvReport(report: WorkspaceOperationalReport): string {
  const lines: string[] = [];

  // UTF-8 BOM for Excel compatibility with Arabic text
  const BOM = "\uFEFF";

  // Section 1: Workspace Overview
  lines.push("=== WORKSPACE OPERATIONAL REPORT ===");
  lines.push(["Workspace Name", "Kind", "Generated At", "Total Members"].map(escapeCsv).join(","));
  lines.push(
    [
      report.workspace.name,
      report.workspace.kind,
      report.generatedAt.toISOString(),
      report.workspace.memberCount,
    ]
      .map(escapeCsv)
      .join(",")
  );
  lines.push("");

  // Section 2: Metrics Summary
  lines.push("=== METRICS SUMMARY ===");
  lines.push(
    [
      "Total Agreements",
      "Draft",
      "Agreed",
      "Active",
      "Completed",
      "Pending Review",
      "Total Commitments",
      "Completed Commitments",
      "Overdue Commitments",
      "Needs Review",
      "Completion Rate (%)",
    ]
      .map(escapeCsv)
      .join(",")
  );
  lines.push(
    [
      report.metrics.agreements.total,
      report.metrics.agreements.draft,
      report.metrics.agreements.agreed,
      report.metrics.agreements.active,
      report.metrics.agreements.completed,
      report.metrics.agreements.pendingReview,
      report.metrics.commitments.total,
      report.metrics.commitments.done,
      report.metrics.commitments.overdue,
      report.metrics.commitments.needsReview,
      `${report.metrics.commitments.completionRate}%`,
    ]
      .map(escapeCsv)
      .join(",")
  );
  lines.push("");

  // Section 3: Agreements Breakdown
  lines.push("=== AGREEMENTS STATUS ===");
  lines.push(
    [
      "Agreement Title",
      "Status",
      "Organizer Name",
      "Organizer Email",
      "Approved Version",
      "Terms Count",
      "Open Commitments",
      "Overdue Commitments",
      "Pending Review",
      "Last Updated",
    ]
      .map(escapeCsv)
      .join(",")
  );
  for (const ag of report.agreements) {
    lines.push(
      [
        ag.title,
        ag.lifecycleStatus,
        ag.organizerName,
        ag.organizerEmail,
        ag.currentApprovedVersionNumber ? `v${ag.currentApprovedVersionNumber}` : "None",
        ag.termsCount,
        ag.openCommitmentsCount,
        ag.overdueCommitmentsCount,
        ag.pendingReview ? "Yes" : "No",
        ag.updatedAt.toISOString(),
      ]
        .map(escapeCsv)
        .join(",")
    );
  }
  lines.push("");

  // Section 4: Commitments Breakdown
  lines.push("=== OPERATIONAL COMMITMENTS ===");
  lines.push(
    [
      "Agreement Title",
      "Commitment Title",
      "Assignee Name",
      "Assignee Email",
      "Status",
      "Due Date",
      "Is Overdue",
      "Needs Review",
      "Created At",
    ]
      .map(escapeCsv)
      .join(",")
  );
  for (const comm of report.commitments) {
    lines.push(
      [
        comm.agreementTitle,
        comm.title,
        comm.assigneeName || "Unassigned",
        comm.assigneeEmail || "",
        comm.status,
        comm.dueAt ? comm.dueAt.toISOString().split("T")[0] : "No Due Date",
        comm.isOverdue ? "Yes" : "No",
        comm.needsReview ? "Yes" : "No",
        comm.createdAt.toISOString(),
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  return BOM + lines.join("\r\n");
}

/**
 * Formats a WorkspaceOperationalReport into standard JSON.
 */
export function generateWorkspaceJsonReport(report: WorkspaceOperationalReport): string {
  return JSON.stringify(report, null, 2);
}
