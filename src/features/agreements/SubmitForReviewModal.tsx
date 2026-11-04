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
        className="sketch-btn sketch-btn-annotation text-xs px-4 py-2 font-marker shadow-[2px_2px_0px_var(--dp-color-ink)]"
      >
        🚀 {translations.submitForReview}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sketch-card-elevated max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="sketch-tape sketch-tape-top" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold font-marker text-[var(--dp-color-ink)]">
                {translations.submitDraftTitle}
              </h3>
              <p className="text-sm font-reading text-[var(--dp-color-ink-muted)]">
                {translations.submitDraftDesc}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 text-xs rounded-[6px_3px_8px_4px] bg-[#fbeee9] border border-[var(--dp-color-accent)] text-[var(--dp-color-accent)] font-reading">
                {errorMessage}
              </div>
            )}

            {!isQuorumMet ? (
              <div className="p-4 rounded-[8px_4px_12px_5px] bg-[var(--dp-color-highlight)]/40 border border-[var(--dp-color-accent)] text-xs text-[var(--dp-color-ink)] space-y-2 font-reading">
                <div className="font-bold font-marker flex items-center gap-1.5 text-[var(--dp-color-accent)]">
                  <span>⚠️</span>
                  <span>{translations.quorumWarning}</span>
                </div>
                <p className="leading-relaxed">
                  عدد الأطراف المنضمين حاليًا المطلوبين للمراجعة: {joinedRequiredParticipants.length} (المطلوب: 2 على الأقل).
                  يرجى دعوة طرف آخر والتأكد من انضمامه وتوثيق بريده قبل تقديم النسخة.
                </p>
              </div>
            ) : (
              <div className="space-y-3 font-reading">
                <div className="p-3 rounded-[6px_3px_8px_4px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-xs space-y-2">
                  <div className="font-bold font-marker text-[var(--dp-color-ink)]">
                    ملخص النسخة المجمدة:
                  </div>
                  <div className="flex items-center gap-4 text-[var(--dp-color-ink-muted)]">
                    <span>• {translations.termsCount?.includes("{count}") ? translations.termsCount.replace("{count}", String(termsCount)) : `${termsCount} ${translations.termsCount}`}</span>
                    <span>• إصدار المسودة: {draftRevision}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold font-marker text-[var(--dp-color-ink)]">
                    {translations.frozenRosterLabel}
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {joinedRequiredParticipants.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 rounded-[5px_2px_7px_3px] bg-[var(--dp-color-scrap)] border border-[var(--dp-color-line)] text-xs flex items-center justify-between"
                      >
                        <span className="font-bold font-marker text-[var(--dp-color-ink)]">
                          {p.partyDisplayName}
                        </span>
                        <span className="text-[var(--dp-color-ink-muted)] text-[11px] font-mono" dir="ltr">
                          {p.emailNormalized}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Approval Policy & Quorum Settings (Sprint 10) */}
                <div className="p-3 rounded-[6px_3px_8px_4px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] space-y-2.5 text-xs">
                  <div className="font-bold font-marker text-[var(--dp-color-ink)]">
                    سياسة الاعتماد والنصاب (Approval Policy):
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setApprovalPolicy("UNANIMOUS")}
                      className={`p-2 rounded-[5px_2px_7px_3px] border text-center font-marker font-bold transition-all cursor-pointer ${
                        approvalPolicy === "UNANIMOUS"
                          ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                          : "border-[var(--dp-color-line)] text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] bg-[var(--dp-color-scrap)]"
                      }`}
                    >
                      إجماع الأطراف
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovalPolicy("MAJORITY")}
                      className={`p-2 rounded-[5px_2px_7px_3px] border text-center font-marker font-bold transition-all cursor-pointer ${
                        approvalPolicy === "MAJORITY"
                          ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                          : "border-[var(--dp-color-line)] text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] bg-[var(--dp-color-scrap)]"
                      }`}
                    >
                      أغلبية المراجعين
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovalPolicy("QUORUM_THRESHOLD")}
                      className={`p-2 rounded-[5px_2px_7px_3px] border text-center font-marker font-bold transition-all cursor-pointer ${
                        approvalPolicy === "QUORUM_THRESHOLD"
                          ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                          : "border-[var(--dp-color-line)] text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] bg-[var(--dp-color-scrap)]"
                      }`}
                    >
                      نصاب محدد
                    </button>
                  </div>

                  {approvalPolicy === "QUORUM_THRESHOLD" && (
                    <div className="flex items-center gap-2 pt-1 font-reading">
                      <span className="text-[var(--dp-color-ink)]">
                        عدد الأصوات المطلوبة للاعتماد:
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={joinedRequiredParticipants.length}
                        value={quorumThreshold}
                        onChange={(e) => setQuorumThreshold(parseInt(e.target.value, 10) || 1)}
                        className="w-16 px-2 py-1 rounded-[5px_2px_6px_3px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-xs font-mono text-center"
                      />
                      <span className="text-[var(--dp-color-ink-muted)] text-[11px]">
                        (من أصل {joinedRequiredParticipants.length} مراجعين)
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 font-reading">
                    <input
                      id="isSequential"
                      type="checkbox"
                      checked={isSequential}
                      onChange={(e) => setIsSequential(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-[var(--dp-color-line)] text-[var(--dp-color-accent)] focus:ring-[var(--dp-color-annotation)] cursor-pointer"
                    />
                    <label
                      htmlFor="isSequential"
                      className="text-[var(--dp-color-ink)] cursor-pointer select-none font-medium"
                    >
                      مراجعة تسلسلية متتابعة حسب مراحل المراجعين (Sequential Review)
                    </label>
                  </div>
                </div>

                <div className="text-[12px] text-[var(--dp-color-annotation)] italic p-2.5 sketch-strip">
                  🛡️ {translations.approvalNotice}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-dashed border-[var(--dp-color-line)]">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="sketch-btn sketch-btn-outline px-4 py-2 text-xs font-marker cursor-pointer"
              >
                {translations.cancel}
              </button>

              {isQuorumMet && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="sketch-btn sketch-btn-annotation px-5 py-2 text-xs font-marker shadow-[2px_2px_0px_var(--dp-color-ink)] cursor-pointer"
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
