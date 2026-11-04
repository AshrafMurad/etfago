"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InviteParticipantModal } from "./InviteParticipantModal";
import { SketchSelect } from "../ui/SketchSelect";
import {
  resendInvitationAction,
  removeParticipantAction,
  updateParticipantRoleAction,
} from "../../server/actions/invitations";

export interface ParticipantItem {
  id: string;
  userId: string | null;
  emailNormalized: string;
  partyDisplayName: string;
  partyKind: "PERSON" | "ORGANIZATION";
  agreementRole: "ORGANIZER" | "EDITOR" | "REVIEWER" | "OBSERVER";
  requiredByDefault: boolean;
  joinedAt: Date | string | null;
}

interface AgreementParticipantsCardProps {
  agreementId: string;
  isOrganizer: boolean;
  participants: ParticipantItem[];
  translations: {
    organizerRole: string;
    participantRole: string;
    upcomingSprintNotice: string;
    inviteParty: string;
    emailLabel: string;
    emailPlaceholder: string;
    partyDisplayName: string;
    partyDisplayNamePlaceholder: string;
    partyKind: string;
    person: string;
    organization: string;
    role: string;
    roles: {
      ORGANIZER: string;
      EDITOR: string;
      REVIEWER: string;
      OBSERVER: string;
    };
    requiredByDefault: string;
    sendInvite: string;
    resend: string;
    remove: string;
    joined: string;
    pending: string;
    cancel: string;
    loading: string;
  };
}

export function AgreementParticipantsCard({
  agreementId,
  isOrganizer,
  participants,
  translations: t,
}: AgreementParticipantsCardProps) {
  const router = useRouter();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleResend = async (participantId: string) => {
    setActionLoadingId(participantId);
    try {
      const res = await resendInvitationAction(agreementId, participantId);
      if (res.success) {
        alert("تم إرسال رابط الدعوة مجددًا بنجاح.");
        router.refresh();
      } else {
        alert(res.error || "Failed to resend invitation");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error resending invitation");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemove = async (participantId: string, name: string) => {
    if (!confirm(`هل أنت متأكد من إزالة (${name}) من هذا الاتفاق؟`)) {
      return;
    }

    setActionLoadingId(participantId);
    try {
      const res = await removeParticipantAction(agreementId, participantId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to remove participant");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error removing participant");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async (
    participantId: string,
    newRole: "EDITOR" | "REVIEWER" | "OBSERVER",
    required: boolean
  ) => {
    setActionLoadingId(participantId);
    try {
      const res = await updateParticipantRoleAction({
        agreementId,
        participantId,
        agreementRole: newRole,
        requiredByDefault: required,
      });
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to update role");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating role");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="sketch-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs font-reading text-[var(--dp-color-ink-muted)]">
          💡 {t.upcomingSprintNotice}
        </p>

        {isOrganizer && (
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="sketch-btn sketch-btn-primary px-4 py-1.5 text-xs font-marker shrink-0"
          >
            + {t.inviteParty}
          </button>
        )}
      </div>

      {/* Participants List */}
      <div className="sketch-card divide-y divide-dashed divide-[var(--dp-color-line)]">
        {participants.map((p) => {
          const isParticipantOrganizer = p.agreementRole === "ORGANIZER";
          const isJoined = p.joinedAt !== null || p.userId !== null;
          const isLoading = actionLoadingId === p.id;

          return (
            <div
              key={p.id}
              className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-reading"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[8px_4px_10px_5px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-[var(--dp-color-ink)] flex items-center justify-center font-bold font-marker text-sm shrink-0 shadow-[1px_1px_0px_var(--dp-color-line)]">
                  {p.partyDisplayName.substring(0, 2).toUpperCase()}
                </div>

                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold font-marker text-[var(--dp-color-ink)]">
                      {p.partyDisplayName}
                    </span>

                    {/* Role badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-[4px_2px_5px_3px] font-bold font-marker ${
                        isParticipantOrganizer
                          ? "bg-[var(--dp-color-ground)] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)]"
                          : "bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] border border-[var(--dp-color-line)]"
                      }`}
                    >
                      {t.roles[p.agreementRole] || p.agreementRole}
                    </span>

                    {/* Joined vs Pending Badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-[4px_2px_5px_3px] font-semibold ${
                        isJoined
                          ? "bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d]"
                          : "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-line)]"
                      }`}
                    >
                      {isJoined ? `✓ ${t.joined}` : `⏳ ${t.pending}`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--dp-color-ink-muted)] font-mono break-all" dir="ltr">
                    <span>{p.emailNormalized}</span>
                    <span className="text-[var(--dp-color-line)]">•</span>
                    <span className="font-sans text-[11px] text-[var(--dp-color-ink-muted)]">
                      {p.partyKind === "ORGANIZATION" ? t.organization : t.person}
                    </span>
                    {p.requiredByDefault && (
                      <>
                        <span className="text-[var(--dp-color-line)]">•</span>
                        <span className="font-sans text-[11px] text-[var(--dp-color-annotation)] font-semibold">
                          مراجع مطلوب
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons (for organizer on non-organizer rows) */}
              {isOrganizer && !isParticipantOrganizer && (
                <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0 mt-2 md:mt-0">
                  {!isJoined && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleResend(p.id)}
                      className="sketch-btn sketch-btn-outline text-xs px-2.5 py-1 font-marker disabled:opacity-50"
                    >
                      {t.resend}
                    </button>
                  )}

                  <div className="w-28">
                    <SketchSelect
                      size="sm"
                      disabled={isLoading}
                      value={p.agreementRole}
                      onChange={(val) =>
                        handleRoleChange(
                          p.id,
                          val as "EDITOR" | "REVIEWER" | "OBSERVER",
                          p.requiredByDefault
                        )
                      }
                      options={[
                        { value: "EDITOR", label: t.roles.EDITOR },
                        { value: "REVIEWER", label: t.roles.REVIEWER },
                        { value: "OBSERVER", label: t.roles.OBSERVER },
                      ]}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleRemove(p.id, p.partyDisplayName)}
                    className="text-xs text-[var(--dp-color-accent)] hover:underline font-bold px-2 py-1 font-marker disabled:opacity-50"
                  >
                    ✕ {t.remove}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invite Modal */}
      {isOrganizer && (
        <InviteParticipantModal
          agreementId={agreementId}
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          translations={{
            inviteParty: t.inviteParty,
            emailLabel: t.emailLabel,
            emailPlaceholder: t.emailPlaceholder,
            partyDisplayName: t.partyDisplayName,
            partyDisplayNamePlaceholder: t.partyDisplayNamePlaceholder,
            partyKind: t.partyKind,
            person: t.person,
            organization: t.organization,
            role: t.role,
            roles: {
              EDITOR: t.roles.EDITOR,
              REVIEWER: t.roles.REVIEWER,
              OBSERVER: t.roles.OBSERVER,
            },
            requiredByDefault: t.requiredByDefault,
            sendInvite: t.sendInvite,
            cancel: t.cancel,
            loading: t.loading,
          }}
        />
      )}
    </div>
  );
}
