"use client";

import React, { useState, useTransition } from "react";
import { ChangeRequestSummary } from "../../server/agreements/proposals";
import {
  resolveChangeRequestAction,
  cancelChangeRequestAction,
} from "../../server/actions/proposals";

interface ChangeProposalsListProps {
  agreementId: string;
  proposals: ChangeRequestSummary[];
  currentUserId: string;
  isOrganizer: boolean;
  canEdit: boolean;
  translations: {
    noProposals: string;
    createFirstProposal: string;
    proposedBy: string;
    termLabel: string;
    reasonLabel: string;
    beforeLabel: string;
    afterLabel: string;
    acceptIntoDraft: string;
    decline: string;
    cancelProposal: string;
    confirmAccept: string;
    confirmDeclineTitle: string;
    declineReasonPlaceholder: string;
    confirmCancel: string;
    status: {
      OPEN: string;
      ACCEPTED_IN_DRAFT: string;
      DECLINED: string;
      CANCELLED: string;
    };
    operations: {
      ADD: string;
      UPDATE: string;
      REMOVE: string;
    };
    loading: string;
    cancel: string;
    filterAll: string;
    filterOpen: string;
    filterResolved: string;
  };
}

export function ChangeProposalsList({
  agreementId,
  proposals,
  currentUserId,
  isOrganizer,
  canEdit,
  translations,
}: ChangeProposalsListProps) {
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");
  const [declineTargetId, setDeclineTargetId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = proposals.filter((p) => {
    if (filter === "OPEN") return p.status === "OPEN";
    if (filter === "RESOLVED") return p.status !== "OPEN";
    return true;
  });

  const handleAccept = (changeRequestId: string) => {
    setActionError(null);
    const formData = new FormData();
    formData.append("agreementId", agreementId);
    formData.append("changeRequestId", changeRequestId);
    formData.append("action", "ACCEPT");

    startTransition(async () => {
      const res = await resolveChangeRequestAction(null, formData);
      if (!res.success) {
        setActionError(res.error || "Failed to accept proposal");
      }
    });
  };

  const handleDeclineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineTargetId) return;

    setActionError(null);
    const formData = new FormData();
    formData.append("agreementId", agreementId);
    formData.append("changeRequestId", declineTargetId);
    formData.append("action", "DECLINE");
    if (declineReason.trim()) {
      formData.append("declineReason", declineReason.trim());
    }

    startTransition(async () => {
      const res = await resolveChangeRequestAction(null, formData);
      if (res.success) {
        setDeclineTargetId(null);
        setDeclineReason("");
      } else {
        setActionError(res.error || "Failed to decline proposal");
      }
    });
  };

  const handleCancel = (changeRequestId: string) => {
    if (!confirm(translations.confirmCancel)) return;

    setActionError(null);
    const formData = new FormData();
    formData.append("agreementId", agreementId);
    formData.append("changeRequestId", changeRequestId);

    startTransition(async () => {
      const res = await cancelChangeRequestAction(null, formData);
      if (!res.success) {
        setActionError(res.error || "Failed to cancel proposal");
      }
    });
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
            {translations.filterAll} ({proposals.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("OPEN")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === "OPEN"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            {translations.filterOpen} (
            {proposals.filter((p) => p.status === "OPEN").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("RESOLVED")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === "RESOLVED"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            {translations.filterResolved} (
            {proposals.filter((p) => p.status !== "OPEN").length})
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
          <p>{translations.noProposals}</p>
          <p className="text-xs text-zinc-400">
            {translations.createFirstProposal}
          </p>
        </div>
      )}

      {/* Proposals List */}
      <div className="space-y-3">
        {filtered.map((proposal) => {
          const isCreator = proposal.createdByUserId === currentUserId;
          const canManage = isOrganizer || canEdit;

          return (
            <div
              key={proposal.id}
              className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-3"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      proposal.status === "OPEN"
                        ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200"
                        : proposal.status === "ACCEPTED_IN_DRAFT"
                        ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {translations.status[proposal.status]}
                  </span>

                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {translations.operations[proposal.operation]}
                  </span>

                  <span className="text-xs text-zinc-500">
                    {translations.proposedBy}:{" "}
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {proposal.creatorName}
                    </strong>
                  </span>
                </div>

                <span className="text-[11px] text-zinc-400">
                  {new Date(proposal.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Reason */}
              {proposal.reason && (
                <div className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200 block mb-0.5">
                    {translations.reasonLabel}:
                  </span>
                  {proposal.reason}
                </div>
              )}

              {/* Before & After comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Old Term */}
                {proposal.oldTerm && (
                  <div className="p-3 rounded-lg border border-rose-200/80 bg-rose-50/30 dark:bg-rose-950/20 space-y-1.5">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                      {translations.beforeLabel} (#{proposal.oldTerm.id})
                    </span>
                    <h5 className="font-bold text-zinc-900 dark:text-zinc-100">
                      {proposal.oldTerm.title}
                    </h5>
                    <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                      {proposal.oldTerm.body}
                    </p>
                    {(proposal.oldTerm.amount || proposal.oldTerm.dueDate) && (
                      <div className="flex gap-3 text-[11px] text-zinc-500 pt-1 font-mono">
                        {proposal.oldTerm.amount && (
                          <span>
                            {proposal.oldTerm.amount} {proposal.oldTerm.currency}
                          </span>
                        )}
                        {proposal.oldTerm.dueDate && (
                          <span>📅 {proposal.oldTerm.dueDate}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* New Term */}
                {proposal.newTerm && (
                  <div className="p-3 rounded-lg border border-emerald-200/80 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                      {translations.afterLabel} (#{proposal.newTerm.id})
                    </span>
                    <h5 className="font-bold text-zinc-900 dark:text-zinc-100">
                      {proposal.newTerm.title}
                    </h5>
                    <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                      {proposal.newTerm.body}
                    </p>
                    {(proposal.newTerm.amount || proposal.newTerm.dueDate) && (
                      <div className="flex gap-3 text-[11px] text-zinc-500 pt-1 font-mono">
                        {proposal.newTerm.amount && (
                          <span>
                            {proposal.newTerm.amount} {proposal.newTerm.currency}
                          </span>
                        )}
                        {proposal.newTerm.dueDate && (
                          <span>📅 {proposal.newTerm.dueDate}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {proposal.status === "OPEN" && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  {/* Cancel by Creator */}
                  {isCreator && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleCancel(proposal.id)}
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium"
                    >
                      {translations.cancelProposal}
                    </button>
                  )}

                  {/* Accept / Decline by Organizer */}
                  {canManage && (
                    <>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setDeclineTargetId(proposal.id)}
                        className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40 text-xs font-semibold"
                      >
                        {translations.decline}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleAccept(proposal.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-60"
                      >
                        {isPending
                          ? translations.loading
                          : translations.acceptIntoDraft}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Decline Reason Modal */}
      {declineTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {translations.confirmDeclineTitle}
            </h3>

            <form onSubmit={handleDeclineSubmit} className="space-y-3">
              <textarea
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder={translations.declineReasonPlaceholder}
                className="w-full text-xs p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeclineTargetId(null)}
                  disabled={isPending}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs"
                >
                  {translations.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs"
                >
                  {isPending ? translations.loading : translations.decline}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
