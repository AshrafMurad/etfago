"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  addWorkspaceMemberAction,
  updateWorkspaceMemberRoleAction,
  removeWorkspaceMemberAction,
} from "../../server/actions/workspaces";

interface Member {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: Date | string;
  user: {
    id: string;
    name: string | null;
    emailNormalized: string;
    emailVerifiedAt: Date | string | null;
  };
}

interface WorkspaceMemberListProps {
  workspaceId: string;
  members: Member[];
  currentActorRole: "OWNER" | "ADMIN" | "MEMBER";
  ownerUserId: string;
  currentActorUserId: string;
}

export function WorkspaceMemberList({
  workspaceId,
  members,
  currentActorRole,
  ownerUserId,
  currentActorUserId,
}: WorkspaceMemberListProps) {
  const t = useTranslations("Workspaces");
  const common = useTranslations("Common");
  const authT = useTranslations("Auth");

  const [addState, addAction, isAdding] = useActionState(addWorkspaceMemberAction, null);
  const [, updateRoleAction] = useActionState(updateWorkspaceMemberRoleAction, null);
  const [, removeAction] = useActionState(removeWorkspaceMemberAction, null);

  const canManage = currentActorRole === "OWNER" || currentActorRole === "ADMIN";

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="sketch-card p-4 space-y-3">
          <h3 className="font-bold font-marker text-[var(--dp-color-ink)] mb-3 text-sm">
            {t("addMember")}
          </h3>

          {addState?.error && (
            <div className="mb-3 p-2 text-xs bg-[#fbeee9] text-[var(--dp-color-accent)] rounded-[4px_2px_5px_3px] border border-[var(--dp-color-accent)] font-reading">
              {addState.error}
            </div>
          )}

          {addState?.success && (
            <div className="mb-3 p-2 text-xs bg-[#eaf3ea] text-[var(--dp-color-ink)] rounded-[4px_2px_5px_3px] border border-[#96b79d] font-reading">
              {addState.message}
            </div>
          )}

          <form action={addAction} className="flex flex-col sm:flex-row gap-3">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input
              type="email"
              name="email"
              required
              placeholder="member@example.com"
              dir="ltr"
              className="flex-1 px-3 py-2 border border-[var(--dp-color-line)] rounded-[6px_3px_7px_4px] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] text-sm font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
            />
            <select
              name="role"
              className="sketch-select px-3 py-2 text-sm font-marker cursor-pointer"
            >
              <option value="MEMBER">{t("roles.MEMBER")}</option>
              {currentActorRole === "OWNER" && (
                <option value="ADMIN">{t("roles.ADMIN")}</option>
              )}
            </select>
            <button
              type="submit"
              disabled={isAdding}
              className="sketch-btn sketch-btn-primary text-xs px-4 py-2 disabled:opacity-50 whitespace-nowrap"
            >
              {isAdding ? common("loading") : common("save")}
            </button>
          </form>
        </div>
      )}

      {/* Member List */}
      <div className="sketch-card divide-y divide-[var(--dp-color-line)]/50 overflow-hidden">
        {members.map((m) => {
          const isOwner = m.user.id === ownerUserId;
          const isSelf = m.user.id === currentActorUserId;
          const canModifyThisMember =
            canManage &&
            !isOwner &&
            !isSelf &&
            (currentActorRole === "OWNER" || m.role === "MEMBER");

          return (
            <div
              key={m.id}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-marker text-[var(--dp-color-ink)]">
                    {m.user.name || m.user.emailNormalized}
                  </span>
                  {m.user.emailVerifiedAt ? (
                    <span className="text-xs px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d] font-bold font-marker">
                      {authT("verifiedBadge")}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] font-bold font-marker">
                      {authT("unverifiedBadge")}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--dp-color-ink-muted)] font-mono" dir="ltr">
                  {m.user.emailNormalized}
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {/* Role badge or editor */}
                {canModifyThisMember && currentActorRole === "OWNER" ? (
                  <form action={updateRoleAction} className="inline-block">
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="targetUserId" value={m.user.id} />
                    <select
                      name="role"
                      defaultValue={m.role}
                      onChange={(e) => e.target.form?.requestSubmit()}
                      className="sketch-select text-xs px-2.5 py-1 font-marker cursor-pointer"
                    >
                      <option value="MEMBER">{t("roles.MEMBER")}</option>
                      <option value="ADMIN">{t("roles.ADMIN")}</option>
                    </select>
                  </form>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)] font-bold font-marker">
                    {t(`roles.${m.role}`)}
                  </span>
                )}

                {/* Remove button */}
                {canModifyThisMember && (
                  <form action={removeAction} className="inline-block">
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="targetUserId" value={m.user.id} />
                    <button
                      type="submit"
                      className="text-xs text-[var(--dp-color-accent)] hover:underline p-1 font-bold font-marker cursor-pointer"
                    >
                      {t("removeMember")}
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
