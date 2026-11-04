"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { createBusinessWorkspaceAction } from "../../server/actions/workspaces";
import { FieldErrorMessage, FormAlert } from "../ui";

export function CreateWorkspaceForm() {
  const t = useTranslations("Workspaces");
  const common = useTranslations("Common");
  const tValidation = useTranslations("Validation");

  const [state, formAction, isPending] = useActionState(createBusinessWorkspaceAction, null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  function validate(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return tValidation("workspaceNameRequired");
    }
    if (trimmed.length < 2) {
      return tValidation("workspaceNameMin");
    }
    if (trimmed.length > 100) {
      return tValidation("workspaceNameMax");
    }
    return null;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const error = validate(name);
    if (error) {
      e.preventDefault();
      setNameError(error);
    } else {
      setNameError(null);
    }
  }

  function handleChange(val: string) {
    setName(val);
    if (nameError) {
      setNameError(validate(val));
    }
  }

  return (
    <div className="sketch-card p-5 relative">
      <h3 className="font-marker font-bold text-lg text-[var(--dp-color-ink)] mb-3">
        {t("createNew")}
      </h3>

      {state?.error && (
        <div className="mb-3">
          <FormAlert type="error" message={state.error} />
        </div>
      )}

      {state?.success && (
        <div className="mb-3">
          <FormAlert type="success" message={t("createdSuccess")} />
        </div>
      )}

      <form
        action={formAction}
        onSubmit={handleSubmit}
        noValidate
        className="space-y-2"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={t("workspaceName")}
              maxLength={100}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "workspace-name-error" : undefined}
              className={`w-full px-3.5 py-2 text-sm font-reading ${
                nameError ? "sketch-input-error" : ""
              }`}
            />
            <FieldErrorMessage id="workspace-name-error" error={nameError} />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="sketch-btn sketch-btn-primary px-4 py-2 text-sm font-marker whitespace-nowrap disabled:opacity-50 self-start"
          >
            {isPending ? common("loading") : common("save")}
          </button>
        </div>
      </form>
    </div>
  );
}
