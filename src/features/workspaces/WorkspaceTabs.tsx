"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileText, BarChart3, Users, Settings } from "lucide-react";

interface WorkspaceTabsProps {
  locale: string;
  workspaceId: string;
  activeTab: string;
  canManageSettings: boolean;
  agreementsCount: number;
  membersCount: number;
}

export function WorkspaceTabs({
  locale,
  workspaceId,
  activeTab,
  canManageSettings,
  agreementsCount,
  membersCount,
}: WorkspaceTabsProps) {
  const t = useTranslations("Workspaces.tabs");

  const tabs = [
    {
      id: "agreements",
      label: t("agreements"),
      icon: FileText,
      badge: agreementsCount,
    },
    {
      id: "reports",
      label: t("reports"),
      icon: BarChart3,
    },
    {
      id: "members",
      label: t("members"),
      icon: Users,
      badge: membersCount,
    },
    ...(canManageSettings
      ? [
          {
            id: "settings",
            label: t("settings"),
            icon: Settings,
          },
        ]
      : []),
  ];

  return (
    <div className="flex border-b-2 border-[var(--dp-color-line)] gap-1.5 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.id}
            href={`/${locale}/workspaces/${workspaceId}?tab=${tab.id}`}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-marker transition-all whitespace-nowrap ${
              isActive
                ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-b-0 border-[var(--dp-color-ink)] shadow-[2px_-2px_0px_var(--dp-color-line)] font-bold rounded-t-[8px_4px]"
                : "bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] border border-b-0 border-transparent hover:border-[var(--dp-color-line)] rounded-t-[8px_4px]"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-[4px_2px_5px_3px] font-mono border ${
                  isActive
                    ? "bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] border-[var(--dp-color-ink)]"
                    : "bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border-[var(--dp-color-line)]"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
