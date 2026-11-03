"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createBusinessWorkspaceAction } from "../../server/actions/workspaces";

export function CreateWorkspaceForm() {
  const t = useTranslations("Workspaces");
  const common = useTranslations("Common");

  const [state, formAction, isPending] = useActionState(createBusinessWorkspaceAction, null);

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        {t("createNew")}
      </h3>

      {state?.error && (
        <div className="mb-3 p-2 text-sm bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="mb-3 p-2 text-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
          {state.message}
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
          className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          {isPending ? common("loading") : common("save")}
        </button>
      </form>
    </div>
  );
}
