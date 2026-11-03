"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InviteParticipantModal } from "./InviteParticipantModal";
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          💡 {t.upcomingSprintNotice}
        </p>

        {isOrganizer && (
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            + {t.inviteParty}
          </button>
        )}
      </div>

      {/* Participants List */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 shadow-2xs">
        {participants.map((p) => {
          const isParticipantOrganizer = p.agreementRole === "ORGANIZER";
          const isJoined = p.joinedAt !== null || p.userId !== null;
          const isLoading = actionLoadingId === p.id;

          return (
            <div
              key={p.id}
              className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0">
                  {p.partyDisplayName.substring(0, 2).toUpperCase()}
                </div>

                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {p.partyDisplayName}
                    </span>

                    {/* Role badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isParticipantOrganizer
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {t.roles[p.agreementRole] || p.agreementRole}
                    </span>

                    {/* Joined vs Pending Badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isJoined
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200"
                      }`}
                    >
                      {isJoined ? `✓ ${t.joined}` : `⏳ ${t.pending}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono" dir="ltr">
                    <span>{p.emailNormalized}</span>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="font-sans text-[11px] text-zinc-400">
                      {p.partyKind === "ORGANIZATION" ? t.organization : t.person}
                    </span>
                    {p.requiredByDefault && (
                      <>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span className="font-sans text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          مراجع مطلوب
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons (for organizer on non-organizer rows) */}
              {isOrganizer && !isParticipantOrganizer && (
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {!isJoined && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleResend(p.id)}
                      className="text-xs px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? t.loading : t.resend}
                    </button>
                  )}

                  <select
                    disabled={isLoading}
                    value={p.agreementRole}
                    onChange={(e) =>
                      handleRoleChange(
                        p.id,
                        e.target.value as "EDITOR" | "REVIEWER" | "OBSERVER",
                        p.requiredByDefault
                      )
                    }
                    className="text-xs px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="REVIEWER">{t.roles.REVIEWER}</option>
                    <option value="EDITOR">{t.roles.EDITOR}</option>
                    <option value="OBSERVER">{t.roles.OBSERVER}</option>
                  </select>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleRemove(p.id, p.partyDisplayName)}
                    className="text-xs px-2.5 py-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium cursor-pointer disabled:opacity-50"
                  >
                    {t.remove}
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
