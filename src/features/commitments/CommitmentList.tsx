"use client";

import React, { useState, useTransition } from "react";
import { CommitmentDetail } from "../../server/commitments/service";
import {
  updateCommitmentStatusAction,
  deleteCommitmentAction,
} from "../../server/actions/commitments";
import { CommitmentStatus } from "../../lib/schemas/commitments";

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
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            {translations.status.TODO}
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200">
            {translations.status.IN_PROGRESS}
          </span>
        );
      case "DONE":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
            {translations.status.DONE}
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-500 line-through">
            {translations.status.CANCELLED}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === "ALL"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            All ({commitments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("ACTIVE")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === "ACTIVE"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
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
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === "COMPLETED"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
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
        <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200">
          {actionError}
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-sm space-y-1">
          <p>{translations.noCommitments}</p>
          <p className="text-xs text-zinc-400">{translations.createFirst}</p>
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
              className={`p-4 rounded-xl border bg-white dark:bg-zinc-900 shadow-2xs space-y-3 transition-colors ${
                commitment.needsReview
                  ? "border-amber-300 dark:border-amber-800/80 bg-amber-50/15"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {/* Needs Review Alert Banner */}
              {commitment.needsReview && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                  <span className="flex items-center gap-1.5 font-medium">
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
                  <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {commitment.title}
                  </h4>
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-2">
                  <select
                    disabled={isPending}
                    value={commitment.status}
                    onChange={(e) =>
                      handleStatusChange(
                        commitment.id,
                        e.target.value as CommitmentStatus,
                        commitment.rowRevision
                      )
                    }
                    className="text-xs px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium cursor-pointer"
                  >
                    <option value="TODO">{translations.status.TODO}</option>
                    <option value="IN_PROGRESS">
                      {translations.status.IN_PROGRESS}
                    </option>
                    <option value="DONE">{translations.status.DONE}</option>
                    <option value="CANCELLED">
                      {translations.status.CANCELLED}
                    </option>
                  </select>

                  {canManage && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(commitment.id)}
                      className="text-xs text-zinc-400 hover:text-rose-600 px-1 py-1"
                      title={translations.delete}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>

              {/* Details */}
              {commitment.details && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                  {commitment.details}
                </p>
              )}

              {/* Metadata footer */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                <span className="flex items-center gap-1">
                  👤 {translations.assigneeLabel}:{" "}
                  <strong className="text-zinc-700 dark:text-zinc-300">
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
