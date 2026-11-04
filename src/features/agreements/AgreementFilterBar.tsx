"use client";

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SketchSelect } from "../ui/SketchSelect";
import { Search } from "lucide-react";

interface WorkspaceItem {
  id: string;
  name: string;
  kind: "PERSONAL" | "BUSINESS";
}

interface AgreementFilterBarProps {
  locale: string;
  workspaces: WorkspaceItem[];
  currentWorkspaceId?: string;
  currentSearch?: string;
  isArchived: boolean;
  translations: {
    allWorkspaces: string;
    searchPlaceholder: string;
    searchButton: string;
    archivedFilter: string;
    activeFilter: string;
  };
}

export function AgreementFilterBar({
  locale,
  workspaces,
  currentWorkspaceId = "",
  currentSearch = "",
  isArchived,
  translations,
}: AgreementFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(currentSearch);

  const applyFilters = (newWorkspaceId?: string, newSearch?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    const targetWs = newWorkspaceId !== undefined ? newWorkspaceId : currentWorkspaceId;
    if (targetWs) {
      params.set("workspaceId", targetWs);
    } else {
      params.delete("workspaceId");
    }

    const targetSearch = newSearch !== undefined ? newSearch : search;
    if (targetSearch.trim()) {
      params.set("search", targetSearch.trim());
    } else {
      params.delete("search");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleWorkspaceChange = (selectedWsId: string) => {
    applyFilters(selectedWsId, search);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(currentWorkspaceId, search);
  };

  const workspaceOptions = [
    { value: "", label: translations.allWorkspaces },
    ...workspaces.map((ws) => ({
      value: ws.id,
      label: ws.name,
      badge: (
        <span className="text-[10px] px-1.5 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)] font-marker">
          {ws.kind === "PERSONAL"
            ? locale === "ar"
              ? "شخصي"
              : "Personal"
            : locale === "ar"
            ? "أعمال"
            : "Business"}
        </span>
      ),
    })),
  ];

  return (
    <div className="sketch-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
      <form onSubmit={handleSearchSubmit} noValidate className="flex flex-1 flex-wrap items-center gap-3 w-full">
        {/* Workspace Dropdown Filter */}
        <div className="min-w-[200px] flex-1 sm:flex-initial">
          <SketchSelect
            size="sm"
            value={currentWorkspaceId}
            onChange={handleWorkspaceChange}
            options={workspaceOptions}
            placeholder={translations.allWorkspaces}
          />
        </div>

        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={translations.searchPlaceholder}
            className="w-full px-3.5 py-1.5 text-xs rounded-[7px_3px_11px_4px] border-[1.5px] border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] placeholder-[var(--dp-color-line)] font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
          />
        </div>

        <button
          type="submit"
          className="sketch-btn sketch-btn-outline px-4 py-1.5 text-xs font-marker cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>{translations.searchButton}</span>
        </button>
      </form>

      {/* Archive Toggle Filter */}
      <div className="flex items-center gap-2 self-end md:self-auto text-xs font-reading">
        <Link
          href={`/${locale}/agreements${isArchived ? "" : "?archived=true"}`}
          className={`px-3 py-1.5 rounded-[6px_3px_9px_4px] border-[1.5px] font-semibold transition-colors ${
            isArchived
              ? "bg-[var(--dp-color-highlight)] border-[var(--dp-color-ink)] text-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
              : "border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)]"
          }`}
        >
          {isArchived ? translations.activeFilter : translations.archivedFilter}
        </Link>
      </div>
    </div>
  );
}
