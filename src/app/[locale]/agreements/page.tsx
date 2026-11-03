import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "../../../server/auth/session";
import { listAgreements } from "../../../server/agreements/service";
import { listUserWorkspaces } from "../../../server/workspaces/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AgreementLifecycleStatus } from "@prisma/client";

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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {tAgreements("title")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {tAgreements("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/agreements/new`}
            className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
          >
            ✦ {tTemplates("browseTemplates")}
          </Link>
          <Link
            href={`/${locale}/agreements/new`}
            className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-xs"
          >
            + {tAgreements("createNew")}
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        <form method="GET" className="flex flex-1 flex-wrap items-center gap-3 w-full">
          {/* Workspace Filter */}
          <select
            name="workspaceId"
            defaultValue={workspaceId || ""}
            className="px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          >
            <option value="">{tAgreements("allWorkspaces")}</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name} ({ws.kind === "PERSONAL" ? "شخصي" : "تجاري"})
              </option>
            ))}
          </select>

          {/* Search Input */}
          <input
            type="text"
            name="search"
            defaultValue={search || ""}
            placeholder={tAgreements("searchPlaceholder")}
            className="px-3.5 py-2 text-xs flex-1 min-w-[180px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
          />

          <button
            type="submit"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 cursor-pointer"
          >
            بحث
          </button>
        </form>

        <div className="flex items-center gap-2 self-end md:self-auto text-xs">
          <Link
            href={`/${locale}/agreements${isArchived ? "" : "?archived=true"}`}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              isArchived
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {isArchived ? "عرض النشطة" : "الأرشيف"}
          </Link>
        </div>
      </div>

      {/* Agreements List / Empty State */}
      {agreements.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="text-zinc-400 text-4xl">📝</div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {tAgreements("noAgreements")}
          </h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            {tAgreements("createFirst")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/${locale}/agreements/new`}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              ✦ {tTemplates("browseTemplates")}
            </Link>
            <Link
              href={`/${locale}/agreements/new`}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
              className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500/80 transition-all shadow-2xs group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                      agreement.lifecycleStatus === "DRAFT"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        : agreement.lifecycleStatus === "AGREED"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {tAgreements(`status.${agreement.lifecycleStatus}`)}
                  </span>

                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {agreement.workspaceName}
                  </span>

                  {agreement.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                      {agreement.category}
                    </span>
                  )}

                  {agreement.isOrganizer && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                      ★ {tAgreements("organizerRole")}
                    </span>
                  )}
                </div>

                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {agreement.title}
                </h2>

                {agreement.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    {agreement.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-zinc-500 self-end sm:self-center shrink-0">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
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
