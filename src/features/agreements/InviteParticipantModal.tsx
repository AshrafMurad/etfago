"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteParticipantAction } from "../../server/actions/invitations";
import { SketchSelect } from "../ui/SketchSelect";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--dp-color-ink)]/40 backdrop-blur-xs">
      <div className="sketch-card w-full max-w-lg p-6 space-y-4 shadow-xl relative">
        <div className="sketch-tape sketch-tape-top" aria-hidden="true" />
        <div className="flex items-center justify-between border-b-[1.5px] border-dashed border-[var(--dp-color-line)] pb-3">
          <h2 className="text-xl font-bold font-marker text-[var(--dp-color-ink)]">
            {t.inviteParty}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-accent)] p-1 cursor-pointer font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-[6px_3px_8px_4px] bg-[#fbeee9] text-xs text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] font-reading">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1">
              {t.emailLabel} *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              required
              className="w-full px-3.5 py-2 text-sm font-reading"
            />
          </div>

          <div>
            <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1">
              {t.partyDisplayName} *
            </label>
            <input
              type="text"
              value={partyDisplayName}
              onChange={(e) => setPartyDisplayName(e.target.value)}
              placeholder={t.partyDisplayNamePlaceholder}
              maxLength={120}
              required
              className="w-full px-3.5 py-2 text-sm font-reading"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1">
                {t.partyKind}
              </label>
              <SketchSelect
                value={partyKind}
                onChange={(val) => setPartyKind(val as "PERSON" | "ORGANIZATION")}
                options={[
                  { value: "PERSON", label: t.person },
                  { value: "ORGANIZATION", label: t.organization },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1">
                {t.role}
              </label>
              <SketchSelect
                value={agreementRole}
                onChange={(val) => setAgreementRole(val as "REVIEWER" | "EDITOR" | "OBSERVER")}
                options={[
                  { value: "REVIEWER", label: t.roles.REVIEWER },
                  { value: "EDITOR", label: t.roles.EDITOR },
                  { value: "OBSERVER", label: t.roles.OBSERVER },
                ]}
              />
            </div>
          </div>

          <div className="p-3 bg-[var(--dp-color-ground)] rounded-[6px_3px_8px_4px] border border-[var(--dp-color-line)] flex items-start gap-2.5 font-reading">
            <input
              type="checkbox"
              id="requiredByDefault"
              checked={requiredByDefault}
              onChange={(e) => setRequiredByDefault(e.target.checked)}
              className="mt-0.5 rounded-sm border-[var(--dp-color-line)] text-[var(--dp-color-accent)] focus:ring-[var(--dp-color-annotation)]"
            />
            <label htmlFor="requiredByDefault" className="text-xs text-[var(--dp-color-ink)] cursor-pointer">
              {t.requiredByDefault}
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="sketch-btn sketch-btn-outline px-4 py-2 text-xs font-marker"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="sketch-btn sketch-btn-primary px-5 py-2 text-xs font-marker disabled:opacity-50"
            >
              {isSubmitting ? t.loading : t.sendInvite}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
