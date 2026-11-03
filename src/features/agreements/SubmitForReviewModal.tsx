"use client";

import React, { useState, useTransition } from "react";
import { submitForReviewAction } from "../../server/actions/versions";

interface ParticipantInfo {
  id: string;
  userId: string | null;
  partyDisplayName: string;
  emailNormalized: string;
  agreementRole: string;
  requiredByDefault: boolean;
  joinedAt: Date | null;
}

interface SubmitForReviewModalProps {
  agreementId: string;
  draftRevision: number;
  termsCount: number;
  participants: ParticipantInfo[];
  translations: {
    submitForReview: string;
    submitDraftTitle: string;
    submitDraftDesc: string;
    quorumWarning: string;
    frozenRosterLabel: string;
    approvalNotice: string;
    cancel: string;
    loading: string;
    termsCount: string;
  };
}

export function SubmitForReviewModal({
  agreementId,
  draftRevision,
  termsCount,
  participants,
  translations,
}: SubmitForReviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [approvalPolicy, setApprovalPolicy] = useState<"UNANIMOUS" | "MAJORITY" | "QUORUM_THRESHOLD">("UNANIMOUS");
  const [quorumThreshold, setQuorumThreshold] = useState<number>(2);
  const [isSequential, setIsSequential] = useState(false);

  // Check quorum: At least two distinct joined users with requiredByDefault
  const joinedRequiredParticipants = participants.filter(
    (p) => p.userId !== null && p.requiredByDefault
  );
  const isQuorumMet = joinedRequiredParticipants.length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isQuorumMet) return;

    setErrorMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("agreementId", agreementId);
      formData.set("expectedDraftRevision", String(draftRevision));
      formData.set("approvalPolicy", approvalPolicy);
      if (approvalPolicy === "QUORUM_THRESHOLD") {
        formData.set("quorumThreshold", String(quorumThreshold));
      }
      formData.set("isSequential", isSequential ? "true" : "false");

      const res = await submitForReviewAction(null, formData);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to submit for review");
      } else {
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
      >
        🚀 {translations.submitForReview}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {translations.submitDraftTitle}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {translations.submitDraftDesc}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 text-xs rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300">
                {errorMessage}
              </div>
            )}

            {!isQuorumMet ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>{translations.quorumWarning}</span>
                </div>
                <p className="text-amber-700/90 dark:text-amber-300/90">
                  عدد الأطراف المنضمين حاليًا المطلوبين للمراجعة: {joinedRequiredParticipants.length} (المطلوب: 2 على الأقل).
                  يرجى دعوة طرف آخر والتأكد من انضمامه وتوثيق بريده قبل تقديم النسخة.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs space-y-2">
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                    ملخص النسخة المجمدة:
                  </div>
                  <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400">
                    <span>• {translations.termsCount.replace("{count}", String(termsCount))}</span>
                    <span>• إصدار المسودة: {draftRevision}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {translations.frozenRosterLabel}
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {joinedRequiredParticipants.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs flex items-center justify-between"
                      >
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {p.partyDisplayName}
                        </span>
                        <span className="text-zinc-500 text-[11px]">
                          {p.emailNormalized}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Approval Policy & Quorum Settings (Sprint 10) */}
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2.5 text-xs">
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                    سياسة الاعتماد والنصاب (Approval Policy):
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setApprovalPolicy("UNANIMOUS")}
                      className={`p-2 rounded-md border text-center font-medium transition-colors cursor-pointer ${
                        approvalPolicy === "UNANIMOUS"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      إجماع الأطراف
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovalPolicy("MAJORITY")}
                      className={`p-2 rounded-md border text-center font-medium transition-colors cursor-pointer ${
                        approvalPolicy === "MAJORITY"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      أغلبية المراجعين
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovalPolicy("QUORUM_THRESHOLD")}
                      className={`p-2 rounded-md border text-center font-medium transition-colors cursor-pointer ${
                        approvalPolicy === "QUORUM_THRESHOLD"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      نصاب محدد
                    </button>
                  </div>

                  {approvalPolicy === "QUORUM_THRESHOLD" && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        عدد الأصوات المطلوبة للاعتماد:
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={joinedRequiredParticipants.length}
                        value={quorumThreshold}
                        onChange={(e) => setQuorumThreshold(parseInt(e.target.value, 10) || 1)}
                        className="w-16 px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-xs font-mono text-center"
                      />
                      <span className="text-zinc-400 text-[11px]">
                        (من أصل {joinedRequiredParticipants.length} مراجعين)
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="isSequential"
                      type="checkbox"
                      checked={isSequential}
                      onChange={(e) => setIsSequential(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                    />
                    <label
                      htmlFor="isSequential"
                      className="text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
                    >
                      مراجعة تسلسلية متتابعة حسب مراحل المراجعين (Sequential Review)
                    </label>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-500 italic p-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-md">
                  🛡️ {translations.approvalNotice}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {translations.cancel}
              </button>

              {isQuorumMet && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  {isPending ? translations.loading : translations.submitForReview}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
