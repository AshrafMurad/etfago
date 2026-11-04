"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redeemInvitationAction } from "../../server/actions/invitations";

interface RedeemInvitationButtonProps {
  token: string;
  locale: string;
  translations: {
    acceptAndJoin: string;
    loading: string;
  };
}

export function RedeemInvitationButton({
  token,
  locale,
  translations: t,
}: RedeemInvitationButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await redeemInvitationAction(token);
      if (res.success && res.agreementId) {
        router.push(`/${locale}/agreements/${res.agreementId}`);
      } else {
        setError(res.error || "Failed to accept invitation");
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-[6px_3px_7px_4px] bg-[#fbeee9] text-xs text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] font-reading">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleRedeem}
        className="sketch-btn sketch-btn-primary w-full py-3 px-6 text-sm font-marker font-bold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSubmitting ? t.loading : t.acceptAndJoin}
      </button>
    </div>
  );
}
