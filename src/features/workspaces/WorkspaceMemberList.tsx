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
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3 text-sm">
            {t("addMember")}
          </h3>

          {addState?.error && (
            <div className="mb-3 p-2 text-sm bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded border border-rose-200">
              {addState.error}
            </div>
          )}

          {addState?.success && (
            <div className="mb-3 p-2 text-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded border border-emerald-200">
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
              className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              name="role"
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="MEMBER">{t("roles.MEMBER")}</option>
              {currentActorRole === "OWNER" && (
                <option value="ADMIN">{t("roles.ADMIN")}</option>
              )}
            </select>
            <button
              type="submit"
              disabled={isAdding}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {isAdding ? common("loading") : common("save")}
            </button>
          </form>
        </div>
      )}

      {/* Member List */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
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
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {m.user.name || m.user.emailNormalized}
                  </span>
                  {m.user.emailVerifiedAt ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium">
                      {authT("verifiedBadge")}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-medium">
                      {authT("unverifiedBadge")}
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono" dir="ltr">
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
                      className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 cursor-pointer"
                    >
                      <option value="MEMBER">{t("roles.MEMBER")}</option>
                      <option value="ADMIN">{t("roles.ADMIN")}</option>
                    </select>
                  </form>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
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
                      className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 p-1 font-medium cursor-pointer"
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
