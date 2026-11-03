"use client";

import React from "react";

export function PrintAgreementButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
    >
      <span>🖨️</span>
      <span>{label}</span>
    </button>
  );
}
