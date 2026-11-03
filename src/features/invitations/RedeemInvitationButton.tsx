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
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleRedeem}
        className="w-full py-3 px-6 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
      >
        {isSubmitting ? t.loading : t.acceptAndJoin}
      </button>
    </div>
  );
}
