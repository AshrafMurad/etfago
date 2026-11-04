import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "../../../server/auth/session";
import { listAgreements } from "../../../server/agreements/service";
import { listUserWorkspaces } from "../../../server/workspaces/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AgreementLifecycleStatus } from "@prisma/client";
import { AgreementFilterBar } from "../../../features/agreements/AgreementFilterBar";

interface AgreementsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    workspaceId?: string;
    status?: string;
    search?: string;
    archived?: string;
  }>;
}

export default async function AgreementsPage({ params, searchParams }: AgreementsPageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  const { workspaceId, status, search, archived } = await searchParams;

  const validStatus =
    status && Object.values(AgreementLifecycleStatus).includes(status as AgreementLifecycleStatus)
      ? (status as AgreementLifecycleStatus)
      : undefined;

  const isArchived = archived === "true";

  const [agreements, workspaces, tAgreements, tTemplates] = await Promise.all([
    listAgreements(user.id, {
      workspaceId,
      status: validStatus,
      search,
      archived: isArchived,
    }),
    listUserWorkspaces(user.id),
    getTranslations({ locale, namespace: "Agreements" }),
    getTranslations({ locale, namespace: "Templates" }),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6 px-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-marker text-[var(--dp-color-ink)]">
            {tAgreements("title")}
          </h1>
          <p className="text-base font-reading text-[var(--dp-color-ink-muted)] mt-1">
            {tAgreements("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/agreements/new`}
            className="sketch-btn sketch-btn-secondary px-4 py-2 text-sm font-marker"
          >
            ✦ {tTemplates("browseTemplates")}
          </Link>
          <Link
            href={`/${locale}/agreements/new`}
            className="sketch-btn sketch-btn-primary px-4 py-2 text-sm font-marker"
          >
            + {tAgreements("createNew")}
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <AgreementFilterBar
        locale={locale}
        workspaces={workspaces}
        currentWorkspaceId={workspaceId}
        currentSearch={search}
        isArchived={isArchived}
        translations={{
          allWorkspaces: tAgreements("allWorkspaces"),
          searchPlaceholder: tAgreements("searchPlaceholder"),
          searchButton: locale === "ar" ? "بحث" : "Search",
          archivedFilter: locale === "ar" ? "الأرشيف" : "Archive",
          activeFilter: locale === "ar" ? "عرض النشطة" : "Active",
        }}
      />

      {/* Agreements List / Empty State */}
      {agreements.length === 0 ? (
        <div className="sketch-card p-12 text-center space-y-4">
          <div className="text-4xl">📝</div>
          <h3 className="text-xl font-bold font-marker text-[var(--dp-color-ink)]">
            {tAgreements("noAgreements")}
          </h3>
          <p className="text-base font-reading text-[var(--dp-color-ink-muted)] max-w-md mx-auto">
            {tAgreements("createFirst")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={`/${locale}/agreements/new`}
              className="sketch-btn sketch-btn-primary px-4 py-2 text-sm font-marker"
            >
              ✦ {tTemplates("browseTemplates")}
            </Link>
            <Link
              href={`/${locale}/agreements/new`}
              className="sketch-btn sketch-btn-secondary px-4 py-2 text-sm font-marker"
            >
              + {tAgreements("createNew")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {agreements.map((agreement) => (
            <Link
              key={agreement.id}
              href={`/${locale}/agreements/${agreement.id}`}
              className="sketch-card p-5 hover:rotate-[-0.2deg] transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4 block"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-[5px_2px_7px_3px] font-semibold font-reading ${
                      agreement.lifecycleStatus === "DRAFT"
                        ? "sketch-highlight border border-[var(--dp-color-ink)]/20"
                        : agreement.lifecycleStatus === "AGREED"
                        ? "bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d]"
                        : "bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)]"
                    }`}
                  >
                    {tAgreements(`status.${agreement.lifecycleStatus}`)}
                  </span>

                  <span className="text-xs px-2 py-0.5 rounded-[5px_2px_7px_3px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-[var(--dp-color-ink-muted)] font-reading">
                    {agreement.workspaceName}
                  </span>

                  {agreement.category && (
                    <span className="text-xs px-2 py-0.5 rounded-[5px_2px_7px_3px] bg-[var(--dp-color-ground)]/60 text-[var(--dp-color-ink-muted)] border border-dashed border-[var(--dp-color-line)] font-reading">
                      {agreement.category}
                    </span>
                  )}

                  {agreement.isOrganizer && (
                    <span className="text-xs text-[var(--dp-color-annotation)] font-semibold font-reading">
                      ★ {tAgreements("organizerRole")}
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-bold font-marker text-[var(--dp-color-ink)] group-hover:text-[var(--dp-color-accent)] transition-colors">
                  {agreement.title}
                </h2>

                {agreement.description && (
                  <p className="text-sm font-reading text-[var(--dp-color-ink-muted)] line-clamp-1">
                    {agreement.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs font-reading text-[var(--dp-color-ink-muted)] self-end sm:self-center shrink-0">
                <span className="font-semibold text-[var(--dp-color-ink)]">
                  {tAgreements("termsCount", { count: agreement.termsCount })}
                </span>
                <span>•</span>
                <span>
                  {tAgreements("participantsCount", { count: agreement.participantCount })}
                </span>
                <span>•</span>
                <span className="font-mono text-[11px]" dir="ltr">
                  {new Date(agreement.updatedAt).toLocaleDateString(locale)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
