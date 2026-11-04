"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createBusinessWorkspaceAction } from "../../server/actions/workspaces";

export function CreateWorkspaceForm() {
  const t = useTranslations("Workspaces");
  const common = useTranslations("Common");

  const [state, formAction, isPending] = useActionState(createBusinessWorkspaceAction, null);

  return (
    <div className="sketch-card p-5 relative">
      <h3 className="font-marker font-bold text-lg text-[var(--dp-color-ink)] mb-3">
        {t("createNew")}
      </h3>

      {state?.error && (
        <div className="mb-3 p-2.5 text-xs bg-[#fbeee9] text-[var(--dp-color-accent)] rounded-[6px_3px_8px_4px] border border-[var(--dp-color-accent)] font-reading">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="mb-3 p-2.5 text-xs bg-[#eaf3ea] text-[var(--dp-color-ink)] rounded-[6px_3px_8px_4px] border border-[#96b79d] font-reading">
          {t("createdSuccess")}
        </div>
      )}

      <form action={formAction} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          name="name"
          placeholder={t("workspaceName")}
          required
          minLength={2}
          maxLength={100}
          className="flex-1 px-3.5 py-2 text-sm font-reading"
        />
        <button
          type="submit"
          disabled={isPending}
          className="sketch-btn sketch-btn-primary px-4 py-2 text-sm font-marker whitespace-nowrap disabled:opacity-50"
        >
          {isPending ? common("loading") : common("save")}
        </button>
      </form>
    </div>
  );
}
