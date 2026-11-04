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
            {translations.filterAll} ({proposals.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("OPEN")}
            className={`px-3 py-1 rounded-[4px_2px_5px_3px] transition-all cursor-pointer ${
              filter === "OPEN"
                ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)]"
            }`}
          >
            {translations.filterOpen} (
            {proposals.filter((p) => p.status === "OPEN").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("RESOLVED")}
            className={`px-3 py-1 rounded-[4px_2px_5px_3px] transition-all cursor-pointer ${
              filter === "RESOLVED"
                ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)]"
            }`}
          >
            {translations.filterResolved} (
            {proposals.filter((p) => p.status !== "OPEN").length})
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
          <p className="font-marker text-base text-[var(--dp-color-ink)]">{translations.noProposals}</p>
          <p className="text-xs font-reading">
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
              className="sketch-card p-5 space-y-3"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--dp-color-line)] pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[11px] font-bold font-marker ${
                      proposal.status === "OPEN"
                        ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)]"
                        : proposal.status === "ACCEPTED_IN_DRAFT"
                        ? "bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d]"
                        : "bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)]"
                    }`}
                  >
                    {translations.status[proposal.status]}
                  </span>

                  <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[11px] font-medium font-marker bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)]">
                    {translations.operations[proposal.operation]}
                  </span>

                  <span className="text-xs text-[var(--dp-color-ink-muted)] font-marker">
                    {translations.proposedBy}:{" "}
                    <strong className="text-[var(--dp-color-ink)]">
                      {proposal.creatorName}
                    </strong>
                  </span>
                </div>

                <span className="text-[11px] text-[var(--dp-color-ink-muted)] font-mono">
                  {new Date(proposal.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Reason */}
              {proposal.reason && (
                <div className="text-xs text-[var(--dp-color-ink)] bg-[var(--dp-color-ground)] p-2.5 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] font-reading leading-relaxed">
                  <span className="font-bold font-marker text-[var(--dp-color-ink)] block mb-0.5">
                    {translations.reasonLabel}:
                  </span>
                  {proposal.reason}
                </div>
              )}

              {/* Before & After comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Old Term */}
                {proposal.oldTerm && (
                  <div className="p-3 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-accent)]/50 bg-[#fbeee9]/40 space-y-1.5">
                    <span className="text-[10px] font-bold font-marker text-[var(--dp-color-accent)] uppercase tracking-wider block">
                      {translations.beforeLabel} (#{proposal.oldTerm.id})
                    </span>
                    <h5 className="font-bold font-marker text-sm text-[var(--dp-color-ink)]">
                      {proposal.oldTerm.title}
                    </h5>
                    <p className="text-[var(--dp-color-ink-muted)] font-reading whitespace-pre-wrap leading-relaxed">
                      {proposal.oldTerm.body}
                    </p>
                    {(proposal.oldTerm.amount || proposal.oldTerm.dueDate) && (
                      <div className="flex gap-3 text-[11px] text-[var(--dp-color-ink-muted)] pt-1 font-mono">
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
                  <div className="p-3 rounded-[6px_3px_7px_4px] border border-[#96b79d] bg-[#eaf3ea]/40 space-y-1.5">
                    <span className="text-[10px] font-bold font-marker text-[#3c6b44] uppercase tracking-wider block">
                      {translations.afterLabel} (#{proposal.newTerm.id})
                    </span>
                    <h5 className="font-bold font-marker text-sm text-[var(--dp-color-ink)]">
                      {proposal.newTerm.title}
                    </h5>
                    <p className="text-[var(--dp-color-ink)] font-reading whitespace-pre-wrap leading-relaxed">
                      {proposal.newTerm.body}
                    </p>
                    {(proposal.newTerm.amount || proposal.newTerm.dueDate) && (
                      <div className="flex gap-3 text-[11px] text-[var(--dp-color-ink-muted)] pt-1 font-mono">
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
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--dp-color-line)]">
                  {/* Cancel by Creator */}
                  {isCreator && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleCancel(proposal.id)}
                      className="sketch-btn sketch-btn-outline text-xs px-3 py-1.5"
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
                        className="sketch-btn text-xs px-3 py-1.5 border border-[var(--dp-color-accent)] text-[var(--dp-color-accent)] bg-[#fbeee9] hover:bg-[var(--dp-color-accent)] hover:text-white"
                      >
                        {translations.decline}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleAccept(proposal.id)}
                        className="sketch-btn sketch-btn-primary text-xs px-3.5 py-1.5 disabled:opacity-60"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[var(--dp-color-ground)] border-2 border-[var(--dp-color-ink)] rounded-[12px_4px_18px_6px] max-w-md w-full p-6 shadow-[6px_6px_0px_var(--dp-color-ink)] space-y-4 relative">
            <div className="sketch-tape-top" />
            <h3 className="text-base font-bold font-marker text-[var(--dp-color-ink)]">
              {translations.confirmDeclineTitle}
            </h3>

            <form onSubmit={handleDeclineSubmit} className="space-y-3">
              <textarea
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder={translations.declineReasonPlaceholder}
                className="w-full text-xs p-3 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeclineTargetId(null)}
                  disabled={isPending}
                  className="sketch-btn sketch-btn-outline text-xs px-3.5 py-1.5"
                >
                  {translations.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="sketch-btn text-xs px-3.5 py-1.5 bg-[var(--dp-color-accent)] text-white border border-[var(--dp-color-ink)] shadow-[2px_2px_0px_var(--dp-color-ink)] font-marker font-bold"
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
