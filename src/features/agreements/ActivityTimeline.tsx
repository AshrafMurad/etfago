interface ActivityItem {
  id: string;
  actorUserId: string | null;
  action: string;
  summaryJson: unknown;
  createdAt: Date | string;
}

interface ActivityTimelineProps {
  activity: ActivityItem[];
  locale: string;
  translations: {
    noActivityYet: string;
    actions: Record<string, string>;
  };
}

export function ActivityTimeline({
  activity,
  locale,
  translations: t,
}: ActivityTimelineProps) {
  if (activity.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
        {t.noActivityYet}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
      <div className="relative border-s border-zinc-200 dark:border-zinc-800 ms-3 space-y-6">
        {activity.map((item) => {
          const actionLabel = t.actions[item.action] || item.action;
          const formattedDate = new Date(item.createdAt).toLocaleString(
            locale === "ar" ? "ar-SA" : "en-US",
            {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          );

          let summaryDisplay: string | null = null;
          if (item.summaryJson && typeof item.summaryJson === "object") {
            const summary = item.summaryJson as Record<string, unknown>;
            if (summary.title) {
              summaryDisplay = `${summary.title}`;
            } else if (summary.revision) {
              summaryDisplay = `نسخة المسودة: ${summary.revision}`;
            }
          }

          return (
            <div key={item.id} className="relative ps-6">
              {/* Dot */}
              <div className="absolute -start-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 bg-emerald-600" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {actionLabel}
                </span>
                <span className="text-xs text-zinc-400 font-mono" dir="ltr">
                  {formattedDate}
                </span>
              </div>

              {summaryDisplay && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {summaryDisplay}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
