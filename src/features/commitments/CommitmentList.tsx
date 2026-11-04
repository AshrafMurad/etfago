"use client";

import React, { useState, useTransition } from "react";
import { CommitmentDetail } from "../../server/commitments/service";
import {
  updateCommitmentStatusAction,
  deleteCommitmentAction,
} from "../../server/actions/commitments";
import { CommitmentStatus } from "../../lib/schemas/commitments";
import { SketchSelect } from "../ui/SketchSelect";

interface CommitmentListProps {
  agreementId: string;
  commitments: CommitmentDetail[];
  currentUserId: string;
  isOrganizer: boolean;
  canEdit: boolean;
  translations: {
    noCommitments: string;
    createFirst: string;
    needsReviewNotice: string;
    status: {
      TODO: string;
      IN_PROGRESS: string;
      DONE: string;
      CANCELLED: string;
    };
    assigneeLabel: string;
    unassigned: string;
    dueDateLabel: string;
    noDueDate: string;
    delete: string;
    confirmDelete: string;
    loading: string;
  };
}

export function CommitmentList({
  agreementId,
  commitments,
  currentUserId,
  isOrganizer,
  canEdit,
  translations,
}: CommitmentListProps) {
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = commitments.filter((c) => {
    if (filter === "ACTIVE") return c.status === "TODO" || c.status === "IN_PROGRESS";
    if (filter === "COMPLETED") return c.status === "DONE" || c.status === "CANCELLED";
    return true;
  });

  const handleStatusChange = (
    commitmentId: string,
    newStatus: CommitmentStatus,
    revision: number
  ) => {
    setActionError(null);
    const formData = new FormData();
    formData.append("agreementId", agreementId);
    formData.append("commitmentId", commitmentId);
    formData.append("status", newStatus);
    formData.append("expectedRevision", String(revision));

    startTransition(async () => {
      const res = await updateCommitmentStatusAction(null, formData);
      if (!res.success) {
        setActionError(res.error || "Failed to update status");
      }
    });
  };

  const handleDelete = (commitmentId: string) => {
    if (!confirm(translations.confirmDelete)) return;

    setActionError(null);
    const formData = new FormData();
    formData.append("agreementId", agreementId);
    formData.append("commitmentId", commitmentId);

    startTransition(async () => {
      const res = await deleteCommitmentAction(null, formData);
      if (!res.success) {
        setActionError(res.error || "Failed to delete commitment");
      }
    });
  };

  const getStatusBadge = (status: CommitmentStatus) => {
    switch (status) {
      case "TODO":
        return (
          <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[11px] font-bold font-marker bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)]">
            {translations.status.TODO}
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[11px] font-bold font-marker bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)]">
            {translations.status.IN_PROGRESS}
          </span>
        );
      case "DONE":
        return (
          <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[11px] font-bold font-marker bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d]">
            ✓ {translations.status.DONE}
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[11px] font-bold font-marker bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] line-through">
            {translations.status.CANCELLED}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--dp-color-line)]">
        <div className="flex items-center gap-1.5 p-1 bg-[var(--dp-color-ground)] rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] text-xs font-marker">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-[4px_2px_5px_3px] transition-all cursor-pointer ${
              filter === "ALL"
                ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)]"
            }`}
          >
            All ({commitments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("ACTIVE")}
            className={`px-3 py-1 rounded-[4px_2px_5px_3px] transition-all cursor-pointer ${
              filter === "ACTIVE"
                ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)]"
            }`}
          >
            Active (
            {
              commitments.filter(
                (c) => c.status === "TODO" || c.status === "IN_PROGRESS"
              ).length
            }
            )
          </button>
          <button
            type="button"
            onClick={() => setFilter("COMPLETED")}
            className={`px-3 py-1 rounded-[4px_2px_5px_3px] transition-all cursor-pointer ${
              filter === "COMPLETED"
                ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)]"
            }`}
          >
            Completed (
            {
              commitments.filter(
                (c) => c.status === "DONE" || c.status === "CANCELLED"
              ).length
            }
            )
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 text-xs rounded-[6px_3px_7px_4px] bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] font-reading">
          {actionError}
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="sketch-card p-8 text-center text-[var(--dp-color-ink-muted)] space-y-1 border-dashed">
          <p className="font-marker text-base text-[var(--dp-color-ink)]">{translations.noCommitments}</p>
          <p className="text-xs font-reading">{translations.createFirst}</p>
        </div>
      )}

      {/* Commitments List */}
      <div className="space-y-3">
        {filtered.map((commitment) => {
          const canManage =
            isOrganizer || canEdit || commitment.createdByUserId === currentUserId;

          return (
            <div
              key={commitment.id}
              className={`p-4 rounded-[8px_4px_12px_5px] border bg-[var(--dp-color-scrap)] shadow-[2px_2px_0px_var(--dp-color-line)] space-y-3 transition-colors ${
                commitment.needsReview
                  ? "border-[var(--dp-color-accent)] bg-[#fcf8ef]"
                  : "border-[var(--dp-color-line)]"
              }`}
            >
              {/* Needs Review Alert Banner */}
              {commitment.needsReview && (
                <div className="p-2.5 rounded-[5px_2px_6px_3px] bg-[var(--dp-color-highlight)]/40 border border-[var(--dp-color-accent)]/40 flex items-center justify-between text-xs text-[var(--dp-color-accent)] font-marker">
                  <span className="flex items-center gap-1.5 font-bold">
                    ⚠️ {translations.needsReviewNotice}
                  </span>
                  {commitment.sourceTermId && (
                    <span className="text-[11px] font-mono opacity-80">
                      #{commitment.sourceTermId}
                    </span>
                  )}
                </div>
              )}

              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getStatusBadge(commitment.status)}
                  <h4 className="font-marker font-bold text-sm text-[var(--dp-color-ink)]">
                    {commitment.title}
                  </h4>
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-2">
                  <div className="w-36">
                    <SketchSelect
                      size="sm"
                      disabled={isPending}
                      value={commitment.status}
                      onChange={(val) =>
                        handleStatusChange(
                          commitment.id,
                          val as CommitmentStatus,
                          commitment.rowRevision
                        )
                      }
                      options={[
                        { value: "TODO", label: translations.status.TODO },
                        { value: "IN_PROGRESS", label: translations.status.IN_PROGRESS },
                        { value: "DONE", label: translations.status.DONE },
                        { value: "CANCELLED", label: translations.status.CANCELLED },
                      ]}
                    />
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(commitment.id)}
                      className="text-xs text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-accent)] px-1.5 py-1 cursor-pointer transition-colors"
                      title={translations.delete}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>

              {/* Details */}
              {commitment.details && (
                <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading whitespace-pre-wrap leading-relaxed">
                  {commitment.details}
                </p>
              )}

              {/* Metadata footer */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--dp-color-ink-muted)] pt-2 border-t border-[var(--dp-color-line)]/60 font-marker">
                <span className="flex items-center gap-1">
                  👤 {translations.assigneeLabel}:{" "}
                  <strong className="text-[var(--dp-color-ink)]">
                    {commitment.assigneeName || translations.unassigned}
                  </strong>
                </span>

                {commitment.dueAt && (
                  <span className="flex items-center gap-1 font-mono">
                    📅 {translations.dueDateLabel}:{" "}
                    {new Date(commitment.dueAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
