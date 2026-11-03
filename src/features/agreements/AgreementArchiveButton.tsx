"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveAgreementAction } from "../../server/actions/agreements";

interface AgreementArchiveButtonProps {
  agreementId: string;
  isArchived: boolean;
  translations: {
    archive: string;
    restore: string;
    loading: string;
  };
}

export function AgreementArchiveButton({
  agreementId,
  isArchived,
  translations: t,
}: AgreementArchiveButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleArchive = async () => {
    const confirmMessage = isArchived
      ? "هل أنت متأكد من استعادة هذا الاتفاق من الأرشيف؟"
      : "هل أنت متأكد من أرشفة هذا الاتفاق؟ سيصبح للقراءة فقط.";

    if (!confirm(confirmMessage)) return;

    setIsLoading(true);
    try {
      const res = await archiveAgreementAction(agreementId, !isArchived);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to update archive status");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating archive status");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleArchive}
      disabled={isLoading}
      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer disabled:opacity-50 ${
        isArchived
          ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
          : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900"
      }`}
    >
      {isLoading ? t.loading : isArchived ? `↻ ${t.restore}` : `🗄 ${t.archive}`}
    </button>
  );
}
