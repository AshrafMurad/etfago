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
    <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 p-5 space-y-4 shadow-2xs">
      {/* Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white">
              v{version.versionNumber}
            </span>
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
              {translations.pendingReviewVersion}
            </span>
            <span className="text-xs text-blue-700 dark:text-blue-300">
              ({approvedCount}/{totalRequired} مكتمل)
            </span>
          </div>

          <p className="text-xs text-blue-800 dark:text-blue-300">
            {translations.waitingOnReviewers.replace(
              "{count}",
              String(totalRequired - approvedCount)
            )}
          </p>
        </div>

        {/* Action Buttons for eligible actor */}
        <div className="flex flex-wrap items-center gap-2">
          {currentReviewer && !hasDecided && (
            <>
              <button
                type="button"
                onClick={() => setShowApproveModal(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                ✓ {translations.recordApproval}
              </button>

              <button
                type="button"
                onClick={() => setShowRequestChangesModal(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                ⚠️ {translations.requestChanges}
              </button>
            </>
          )}

          {isOrganizer && (
            <button
              type="button"
              onClick={() => setShowWithdrawModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              {translations.withdrawReview}
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 text-xs rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Reviewers Roster & Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-blue-200 dark:border-blue-900/60">
        {version.reviewers.map((reviewer) => {
          const isApproved = reviewer.decision?.decision === "APPROVE";
          const isRejected = reviewer.decision?.decision === "REQUEST_CHANGES";

          return (
            <div
              key={reviewer.id}
              className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-blue-100 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {reviewer.nameSnapshot}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">
                  {reviewer.emailSnapshot}
                </div>
              </div>

              <div className="shrink-0 text-end">
                {isApproved ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                    ✓ تمت الموافقة
                  </span>
                ) : isRejected ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                    ⚠️ طلب تعديل
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                    ⏳ بانتظار القرار
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Hash & Trust Boundary Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 pt-2 border-t border-blue-100 dark:border-blue-900/40">
        <div className="flex items-center gap-1.5 font-mono">
          <span>{translations.hashLabel}</span>
          <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-700 dark:text-zinc-300">
            {version.contentHash.slice(0, 16)}...
          </span>
          <button
            type="button"
            onClick={handleCopyHash}
            className="text-blue-600 hover:text-blue-700 underline text-[10px] cursor-pointer"
          >
            {copiedHash ? "✓ تم النسخ" : translations.copyHash}
          </button>
        </div>

        <div className="text-[11px] text-zinc-500 italic">
          🛡️ {translations.disclaimer}
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {translations.approveTitle}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {translations.approveDesc}
            </p>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
              <p>• {translations.unanimousNotice}</p>
              <p>• {translations.approvalNotice}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {translations.cancel}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                {isPending ? translations.loading : translations.recordApproval}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {showRequestChangesModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {translations.requestChangesTitle}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {translations.requestChangesDesc}
            </p>

            <form onSubmit={handleRequestChanges} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {translations.requestChangesReasonLabel}
                </label>
                <textarea
                  required
                  rows={4}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder={translations.requestChangesReasonPlaceholder}
                  className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 p-2.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestChangesModal(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  {translations.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isPending || !requestReason.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {translations.withdrawReview}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {translations.withdrawConfirm}
            </p>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="space-y-1">
                <input
                  type="text"
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder={translations.withdrawReasonPlaceholder}
                  className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 p-2.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  {translations.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-900 text-white shadow-xs transition-colors cursor-pointer"
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
