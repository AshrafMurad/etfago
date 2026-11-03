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
    <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.id}
            href={`/${locale}/workspaces/${workspaceId}?tab=${tab.id}`}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              isActive
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
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
