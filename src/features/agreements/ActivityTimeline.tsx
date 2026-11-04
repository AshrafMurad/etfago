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
      <div className="sketch-card p-8 text-center text-sm text-[var(--dp-color-ink-muted)] font-reading border-dashed">
        {t.noActivityYet}
      </div>
    );
  }

  return (
    <div className="sketch-card p-6 space-y-6 relative">
      <div className="relative border-s-2 border-dashed border-[var(--dp-color-line)] ms-3 space-y-6">
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
            if (summary.termId && summary.operation) {
              summaryDisplay = `${summary.operation} (#${summary.termId})${
                summary.reason ? ` — ${summary.reason}` : ""
              }`;
            } else if (summary.snippet) {
              summaryDisplay = `"${summary.snippet}"`;
            } else if (summary.versionNumber) {
              summaryDisplay = `Version ${summary.versionNumber}`;
            } else if (summary.title) {
              summaryDisplay = `${summary.title}`;
            } else if (summary.revision) {
              summaryDisplay = `Revision ${summary.revision}`;
            } else if (summary.inviteeEmail) {
              summaryDisplay = `${summary.inviteeEmail}`;
            }
          }

          return (
            <div key={item.id} className="relative ps-6">
              {/* Dot / Stamp */}
              <div className="absolute -start-[8px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--dp-color-ground)] bg-[var(--dp-color-annotation)] shadow-[1px_1px_0px_var(--dp-color-ink)]" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-sm font-bold font-marker text-[var(--dp-color-ink)]">
                  {actionLabel}
                </span>
                <span className="text-xs text-[var(--dp-color-ink-muted)] font-mono" dir="ltr">
                  {formattedDate}
                </span>
              </div>

              {summaryDisplay && (
                <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading mt-0.5">
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
