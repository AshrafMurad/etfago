"use client";

import React, { useState, useTransition } from "react";
import {
  AgreementVersionDetail,
} from "../../server/agreements/versions";
import {
  recordReviewDecisionAction,
  withdrawReviewAction,
} from "../../server/actions/versions";

interface VersionReviewBannerProps {
  agreementId: string;
  version: AgreementVersionDetail;
  currentUserId: string;
  isOrganizer: boolean;
  translations: {
    pendingReviewVersion: string;
    awaitingApproval: string;
    waitingOnReviewers: string;
    recordApproval: string;
    requestChanges: string;
    withdrawReview: string;
    withdrawConfirm: string;
    withdrawReasonPlaceholder: string;
    requestChangesTitle: string;
    requestChangesDesc: string;
    requestChangesReasonLabel: string;
    requestChangesReasonPlaceholder: string;
    approveTitle: string;
    approveDesc: string;
    unanimousNotice: string;
    hashLabel: string;
    copyHash: string;
    approvalNotice: string;
    cancel: string;
    loading: string;
    disclaimer: string;
    roles: Record<string, string>;
  };
}

export function VersionReviewBanner({
  agreementId,
  version,
  currentUserId,
  isOrganizer,
  translations,
}: VersionReviewBannerProps) {
  const [isPending, startTransition] = useTransition();
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const [requestReason, setRequestReason] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Check current user's reviewer record
  const currentReviewer = version.reviewers.find(
    (r) => r.userId === currentUserId && r.required
  );
  const hasDecided = !!currentReviewer?.decision;

  const totalRequired = version.reviewers.filter((r) => r.required).length;
  const approvedCount = version.reviewers.filter(
    (r) => r.required && r.decision?.decision === "APPROVE"
  ).length;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(version.contentHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleApprove = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("agreementId", agreementId);
      formData.set("versionId", version.id);
      formData.set("decision", "APPROVE");
      formData.set("expectedVersionHash", version.contentHash);

      const res = await recordReviewDecisionAction(null, formData);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to record approval");
      } else {
        setShowApproveModal(false);
      }
    });
  };

  const handleRequestChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReason.trim()) return;

    setErrorMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("agreementId", agreementId);
      formData.set("versionId", version.id);
      formData.set("decision", "REQUEST_CHANGES");
      formData.set("expectedVersionHash", version.contentHash);
      formData.set("reason", requestReason.trim());

      const res = await recordReviewDecisionAction(null, formData);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to request changes");
      } else {
        setShowRequestChangesModal(false);
      }
    });
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("agreementId", agreementId);
      formData.set("versionId", version.id);
      if (withdrawReason.trim()) {
        formData.set("reason", withdrawReason.trim());
      }

      const res = await withdrawReviewAction(null, formData);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to withdraw review");
      } else {
        setShowWithdrawModal(false);
      }
    });
  };

  return (
    <div className="sketch-card p-5 space-y-4 border-[1.5px] border-[var(--dp-color-annotation)] bg-[var(--dp-color-scrap)] shadow-[2px_3px_0px_var(--dp-color-annotation)]">
      {/* Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-[5px_2px_7px_3px] text-xs font-bold font-marker bg-[var(--dp-color-annotation)] text-white shadow-[1px_1px_0px_var(--dp-color-ink)]">
              v{version.versionNumber}
            </span>
            <span className="text-sm font-bold font-marker text-[var(--dp-color-ink)]">
              {translations.pendingReviewVersion}
            </span>
            <span className="text-xs font-reading text-[var(--dp-color-annotation)] font-semibold">
              ({approvedCount}/{totalRequired} مكتمل)
            </span>
          </div>

          <p className="text-xs font-reading text-[var(--dp-color-ink-muted)]">
            {translations.waitingOnReviewers?.includes("{count}")
              ? translations.waitingOnReviewers.replace(
                  "{count}",
                  String(totalRequired - approvedCount)
                )
              : translations.waitingOnReviewers}
          </p>
        </div>

        {/* Action Buttons for eligible actor */}
        <div className="flex flex-wrap items-center gap-2">
          {currentReviewer && !hasDecided && (
            <>
              <button
                type="button"
                onClick={() => setShowApproveModal(true)}
                className="sketch-btn sketch-btn-primary px-3.5 py-1.5 text-xs font-marker"
              >
                ✓ {translations.recordApproval}
              </button>

              <button
                type="button"
                onClick={() => setShowRequestChangesModal(true)}
                className="sketch-btn px-3.5 py-1.5 text-xs font-marker bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border-[var(--dp-color-ink)] shadow-[2px_2px_0px_var(--dp-color-ink)]"
              >
                ⚠️ {translations.requestChanges}
              </button>
            </>
          )}

          {isOrganizer && (
            <button
              type="button"
              onClick={() => setShowWithdrawModal(true)}
              className="sketch-btn sketch-btn-outline px-3 py-1.5 text-xs font-marker"
            >
              {translations.withdrawReview}
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 text-xs rounded-[6px_3px_8px_4px] bg-[#fbeee9] border border-[var(--dp-color-accent)] text-[var(--dp-color-accent)] font-reading">
          {errorMessage}
        </div>
      )}

      {/* Reviewers Roster & Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-dashed border-[var(--dp-color-line)]">
        {version.reviewers.map((reviewer) => {
          const isApproved = reviewer.decision?.decision === "APPROVE";
          const isRejected = reviewer.decision?.decision === "REQUEST_CHANGES";

          return (
            <div
              key={reviewer.id}
              className="p-2.5 rounded-[6px_3px_8px_4px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] flex items-center justify-between gap-2 text-xs font-reading"
            >
              <div className="min-w-0">
                <div className="font-bold text-[var(--dp-color-ink)] truncate font-marker">
                  {reviewer.nameSnapshot}
                </div>
                <div className="text-[11px] text-[var(--dp-color-ink-muted)] truncate">
                  {reviewer.emailSnapshot}
                </div>
              </div>

              <div className="shrink-0 text-end">
                {isApproved ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[10px] font-bold bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d]">
                    ✓ تمت الموافقة
                  </span>
                ) : isRejected ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[10px] font-bold bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-line)]">
                    ⚠️ طلب تعديل
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[10px] font-bold bg-[var(--dp-color-scrap)] text-[var(--dp-color-annotation)] border border-[var(--dp-color-annotation)]">
                    ⏳ بانتظار القرار
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Hash & Trust Boundary Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[var(--dp-color-ink-muted)] pt-2 border-t border-dashed border-[var(--dp-color-line)] font-reading">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="font-reading text-xs">{translations.hashLabel}:</span>
          <span className="bg-[var(--dp-color-ground)] px-1.5 py-0.5 rounded border border-[var(--dp-color-line)] text-[var(--dp-color-ink)] select-all font-semibold">
            {version.contentHash.slice(0, 16)}...
          </span>
          <button
            type="button"
            onClick={handleCopyHash}
            className="text-[var(--dp-color-annotation)] font-reading font-semibold hover:underline cursor-pointer"
          >
            {copiedHash ? "✓ تم النسخ" : translations.copyHash}
          </button>
        </div>

        <div className="text-[11px] text-[var(--dp-color-ink-muted)] italic font-reading">
          🛡️ {translations.disclaimer}
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-[var(--dp-color-ink)]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sketch-card max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <div className="sketch-tape sketch-tape-top" aria-hidden="true" />
            <h3 className="text-lg font-bold font-marker text-[var(--dp-color-ink)]">
              {translations.approveTitle}
            </h3>
            <p className="text-sm font-reading text-[var(--dp-color-ink-muted)]">
              {translations.approveDesc}
            </p>
            <div className="p-3 bg-[var(--dp-color-ground)] rounded-[6px_3px_8px_4px] border border-[var(--dp-color-line)] text-xs font-reading text-[var(--dp-color-ink)] space-y-1">
              <p>• {translations.unanimousNotice}</p>
              <p>• {translations.approvalNotice}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                disabled={isPending}
                className="sketch-btn sketch-btn-outline px-4 py-2 text-xs font-marker"
              >
                {translations.cancel}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="sketch-btn sketch-btn-primary px-4 py-2 text-xs font-marker"
              >
                {isPending ? translations.loading : translations.recordApproval}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {showRequestChangesModal && (
        <div className="fixed inset-0 z-50 bg-[var(--dp-color-ink)]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sketch-card max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <div className="sketch-tape sketch-tape-top" aria-hidden="true" />
            <h3 className="text-lg font-bold font-marker text-[var(--dp-color-ink)]">
              {translations.requestChangesTitle}
            </h3>
            <p className="text-xs font-reading text-[var(--dp-color-ink-muted)]">
              {translations.requestChangesDesc}
            </p>

            <form onSubmit={handleRequestChanges} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold font-reading text-[var(--dp-color-ink)]">
                  {translations.requestChangesReasonLabel}
                </label>
                <textarea
                  required
                  rows={4}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder={translations.requestChangesReasonPlaceholder}
                  className="w-full text-xs p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestChangesModal(false)}
                  disabled={isPending}
                  className="sketch-btn sketch-btn-outline px-4 py-2 text-xs font-marker"
                >
                  {translations.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isPending || !requestReason.trim()}
                  className="sketch-btn px-4 py-2 text-xs font-marker bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border-[var(--dp-color-ink)] shadow-[2px_2px_0px_var(--dp-color-ink)]"
                >
                  {isPending ? translations.loading : translations.requestChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-[var(--dp-color-ink)]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sketch-card max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <div className="sketch-tape sketch-tape-top" aria-hidden="true" />
            <h3 className="text-lg font-bold font-marker text-[var(--dp-color-ink)]">
              {translations.withdrawReview}
            </h3>
            <p className="text-xs font-reading text-[var(--dp-color-ink-muted)]">
              {translations.withdrawConfirm}
            </p>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="space-y-1">
                <input
                  type="text"
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder={translations.withdrawReasonPlaceholder}
                  className="w-full text-xs p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={isPending}
                  className="sketch-btn sketch-btn-outline px-4 py-2 text-xs font-marker"
                >
                  {translations.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="sketch-btn sketch-btn-primary px-4 py-2 text-xs font-marker"
                >
                  {isPending ? translations.loading : translations.withdrawReview}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
