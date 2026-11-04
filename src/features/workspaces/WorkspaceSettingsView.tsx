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
  const tWorkspaces = useTranslations("Workspaces");
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
      <div className="sketch-card p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold font-marker text-[var(--dp-color-ink)] flex items-center gap-2">
            <Settings className="w-4 h-4 text-[var(--dp-color-ink-muted)]" />
            <span>{t("renameTitle")}</span>
          </h3>
          <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading mt-1">
            {t("renameDesc")}
          </p>
        </div>

        {renameState?.error && (
          <div className="p-3 text-xs bg-[#fbeee9] text-[var(--dp-color-accent)] rounded-[6px_3px_7px_4px] border border-[var(--dp-color-accent)] font-reading">
            {renameState.error}
          </div>
        )}

        {renameState?.success && (
          <div className="p-3 text-xs bg-[#eaf3ea] text-[var(--dp-color-ink)] rounded-[6px_3px_7px_4px] border border-[#96b79d] font-reading">
            {t("renameSuccess")}
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
            className="flex-1 px-3 py-2 text-sm border border-[var(--dp-color-line)] rounded-[6px_3px_7px_4px] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
          />
          <button
            type="submit"
            disabled={isRenaming}
            className="sketch-btn sketch-btn-primary text-xs px-4 py-2 disabled:opacity-50 whitespace-nowrap"
          >
            {isRenaming ? common("loading") : t("saveName")}
          </button>
        </form>
      </div>

      {/* 2. Transfer Ownership (Owner only) */}
      {isOwner && (
        <div className="sketch-card p-6 space-y-4 border-[var(--dp-color-annotation)]">
          <div>
            <h3 className="text-base font-bold font-marker text-[var(--dp-color-ink)] flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-[var(--dp-color-annotation)]" />
              <span>{t("transferTitle")}</span>
            </h3>
            <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading mt-1">
              {t("transferDesc")}
            </p>
          </div>

          {transferState?.error && (
            <div className="p-3 text-xs bg-[#fbeee9] text-[var(--dp-color-accent)] rounded-[6px_3px_7px_4px] border border-[var(--dp-color-accent)] font-reading">
              {transferState.error}
            </div>
          )}

          {transferState?.success && (
            <div className="p-3 text-xs bg-[#eaf3ea] text-[var(--dp-color-ink)] rounded-[6px_3px_7px_4px] border border-[#96b79d] font-reading">
              {t("transferSuccess")}
            </div>
          )}

          {eligibleNewOwners.length === 0 ? (
            <div className="text-xs text-[var(--dp-color-ink-muted)] p-3 bg-[var(--dp-color-ground)] rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] font-reading">
              {t("noEligibleMembers")}
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
                className="sketch-select flex-1 px-3 py-2 text-sm font-marker"
              >
                <option value="">{t("selectNewOwner")}</option>
                {eligibleNewOwners.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name || m.user.emailNormalized} ({tWorkspaces(`roles.${m.role}`)})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isTransferring}
                className="sketch-btn text-xs px-4 py-2 bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] font-marker font-bold disabled:opacity-50 whitespace-nowrap"
              >
                {isTransferring ? common("loading") : t("transferButton")}
              </button>
            </form>
          )}
        </div>
      )}

      {/* 3. Archive / Restore Workspace (Owner only, Business only) */}
      {isOwner && (
        <div className="sketch-card p-6 space-y-4 border-[var(--dp-color-accent)]">
          <div>
            <h3 className="text-base font-bold font-marker text-[var(--dp-color-accent)] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>{t("archiveTitle")}</span>
            </h3>
            <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading mt-1">
              {workspaceKind === "PERSONAL"
                ? t("personalCannotArchive")
                : t("archiveDesc")}
            </p>
          </div>

          {archiveState?.error && (
            <div className="p-3 text-xs bg-[#fbeee9] text-[var(--dp-color-accent)] rounded-[6px_3px_7px_4px] border border-[var(--dp-color-accent)] font-reading">
              {archiveState.error}
            </div>
          )}

          {archiveState?.success && (
            <div className="p-3 text-xs bg-[#eaf3ea] text-[var(--dp-color-ink)] rounded-[6px_3px_7px_4px] border border-[#96b79d] font-reading">
              {isArchived ? t("restoreSuccess") : t("archiveSuccess")}
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
                className={`sketch-btn text-xs px-4 py-2 font-marker font-bold ${
                  isArchived
                    ? "bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)]"
                    : "bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)]"
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
