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
      className={`sketch-btn text-xs px-3 py-1.5 font-marker ${
        isArchived
          ? "bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d] hover:bg-[#d8ebd8]"
          : "sketch-btn-outline"
      }`}
    >
      {isLoading ? t.loading : isArchived ? `↻ ${t.restore}` : `🗄 ${t.archive}`}
    </button>
  );
}
