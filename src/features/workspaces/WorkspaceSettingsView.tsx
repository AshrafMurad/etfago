"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  updateWorkspaceAction,
  archiveWorkspaceAction,
  transferWorkspaceOwnershipAction,
} from "../../server/actions/workspaces";
import { Settings, ShieldAlert, ArrowRightLeft } from "lucide-react";

interface Member {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user: {
    id: string;
    name: string | null;
    emailNormalized: string;
  };
}

interface WorkspaceSettingsViewProps {
  workspaceId: string;
  workspaceName: string;
  workspaceKind: "PERSONAL" | "BUSINESS";
  isArchived: boolean;
  currentActorRole: "OWNER" | "ADMIN" | "MEMBER";
  isOwner: boolean;
  members: Member[];
}

export function WorkspaceSettingsView({
  workspaceId,
  workspaceName,
  workspaceKind,
  isArchived,
  isOwner,
  members,
}: WorkspaceSettingsViewProps) {
  const t = useTranslations("Workspaces.settings");
  const common = useTranslations("Common");

  const [renameState, renameAction, isRenaming] = useActionState(updateWorkspaceAction, null);
  const [transferState, transferAction, isTransferring] = useActionState(
    transferWorkspaceOwnershipAction,
    null
  );
  const [archiveState, archiveAction, isArchiving] = useActionState(archiveWorkspaceAction, null);

  const eligibleNewOwners = members.filter((m) => m.role !== "OWNER");

  return (
    <div className="space-y-6">
      {/* 1. Rename Workspace */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <span>{t("renameTitle")}</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("renameDesc")}
          </p>
        </div>

        {renameState?.error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-200">
            {renameState.error}
          </div>
        )}

        {renameState?.success && (
          <div className="p-3 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200">
            {renameState.message}
          </div>
        )}

        <form action={renameAction} className="flex flex-col sm:flex-row gap-3 max-w-lg">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input
            type="text"
            name="name"
            defaultValue={workspaceName}
            required
            minLength={2}
            maxLength={100}
            className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={isRenaming}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            {isRenaming ? common("loading") : t("saveName")}
          </button>
        </form>
      </div>

      {/* 2. Transfer Ownership (Owner only) */}
      {isOwner && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{t("transferTitle")}</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {t("transferDesc")}
            </p>
          </div>

          {transferState?.error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-200">
              {transferState.error}
            </div>
          )}

          {transferState?.success && (
            <div className="p-3 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200">
              {transferState.message}
            </div>
          )}

          {eligibleNewOwners.length === 0 ? (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              No other active members in this workspace to transfer ownership to. Add team members first.
            </div>
          ) : (
            <form
              action={transferAction}
              onSubmit={(e) => {
                if (!confirm(t("transferConfirm"))) {
                  e.preventDefault();
                }
              }}
              className="flex flex-col sm:flex-row gap-3 max-w-lg"
            >
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <select
                name="newOwnerUserId"
                required
                className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">{t("selectNewOwner")}</option>
                {eligibleNewOwners.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name || m.user.emailNormalized} ({m.role})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isTransferring}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {isTransferring ? common("loading") : t("transferButton")}
              </button>
            </form>
          )}
        </div>
      )}

      {/* 3. Archive / Restore Workspace (Owner only, Business only) */}
      {isOwner && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-rose-200 dark:border-rose-950/60 space-y-4">
          <div>
            <h3 className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>{t("archiveTitle")}</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {workspaceKind === "PERSONAL"
                ? t("personalCannotArchive")
                : t("archiveDesc")}
            </p>
          </div>

          {archiveState?.error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-200">
              {archiveState.error}
            </div>
          )}

          {archiveState?.success && (
            <div className="p-3 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200">
              {archiveState.message}
            </div>
          )}

          {workspaceKind === "BUSINESS" && (
            <form
              action={archiveAction}
              onSubmit={(e) => {
                if (!confirm(t("archiveWarning"))) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input
                type="hidden"
                name="archive"
                value={isArchived ? "false" : "true"}
              />
              <button
                type="submit"
                disabled={isArchiving}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  isArchived
                    ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                {isArchiving
                  ? common("loading")
                  : isArchived
                  ? t("restoreButton")
                  : t("archiveButton")}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
