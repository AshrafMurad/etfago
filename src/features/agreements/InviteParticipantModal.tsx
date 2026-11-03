"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteParticipantAction } from "../../server/actions/invitations";

interface InviteParticipantModalProps {
  agreementId: string;
  isOpen: boolean;
  onClose: () => void;
  translations: {
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
      EDITOR: string;
      REVIEWER: string;
      OBSERVER: string;
    };
    requiredByDefault: string;
    sendInvite: string;
    cancel: string;
    loading: string;
  };
}

export function InviteParticipantModal({
  agreementId,
  isOpen,
  onClose,
  translations: t,
}: InviteParticipantModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [partyDisplayName, setPartyDisplayName] = useState("");
  const [partyKind, setPartyKind] = useState<"PERSON" | "ORGANIZATION">("PERSON");
  const [agreementRole, setAgreementRole] = useState<"REVIEWER" | "EDITOR" | "OBSERVER">("REVIEWER");
  const [requiredByDefault, setRequiredByDefault] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !partyDisplayName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("agreementId", agreementId);
    formData.append("email", email.trim());
    formData.append("partyDisplayName", partyDisplayName.trim());
    formData.append("partyKind", partyKind);
    formData.append("agreementRole", agreementRole);
    formData.append("requiredByDefault", requiredByDefault ? "true" : "false");

    try {
      const res = await inviteParticipantAction(null, formData);
      if (res.success) {
        setEmail("");
        setPartyDisplayName("");
        onClose();
        router.refresh();
      } else {
        setError(res.error || "Failed to invite participant");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {t.inviteParty}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              {t.emailLabel} *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              {t.partyDisplayName} *
            </label>
            <input
              type="text"
              value={partyDisplayName}
              onChange={(e) => setPartyDisplayName(e.target.value)}
              placeholder={t.partyDisplayNamePlaceholder}
              maxLength={120}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {t.partyKind}
              </label>
              <select
                value={partyKind}
                onChange={(e) => setPartyKind(e.target.value as "PERSON" | "ORGANIZATION")}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
              >
                <option value="PERSON">{t.person}</option>
                <option value="ORGANIZATION">{t.organization}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {t.role}
              </label>
              <select
                value={agreementRole}
                onChange={(e) =>
                  setAgreementRole(e.target.value as "REVIEWER" | "EDITOR" | "OBSERVER")
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
              >
                <option value="REVIEWER">{t.roles.REVIEWER}</option>
                <option value="EDITOR">{t.roles.EDITOR}</option>
                <option value="OBSERVER">{t.roles.OBSERVER}</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="requiredByDefault"
              checked={requiredByDefault}
              onChange={(e) => setRequiredByDefault(e.target.checked)}
              className="mt-0.5 rounded-sm border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="requiredByDefault" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
              {t.requiredByDefault}
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isSubmitting ? t.loading : t.sendInvite}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
