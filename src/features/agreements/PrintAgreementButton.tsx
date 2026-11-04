"use client";

import React from "react";

export function PrintAgreementButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="sketch-btn sketch-btn-primary text-xs flex items-center gap-1.5"
    >
      <span>🖨️</span>
      <span>{label}</span>
    </button>
  );
}
