import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "../../../../../server/auth/session";
import { getAgreementDetail } from "../../../../../server/agreements/service";
import { getVersionDetail } from "../../../../../server/agreements/versions";
import { listCommitments } from "../../../../../server/commitments/service";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ForbiddenError, NotFoundError } from "../../../../../lib/errors";
import { PrintAgreementButton } from "../../../../../features/agreements/PrintAgreementButton";

interface ExportPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AgreementExportPage({
  params,
}: ExportPageProps) {
  const { locale, id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  let agreement;
  let approvedVersion = null;
  let commitments = [];

  try {
    agreement = await getAgreementDetail(user.id, id);
    if (agreement.currentApprovedVersionId) {
      approvedVersion = await getVersionDetail(
        user.id,
        id,
        agreement.currentApprovedVersionId
      );
    }
    commitments = await listCommitments(user.id, id);
  } catch (err: unknown) {
    if (err instanceof ForbiddenError || err instanceof NotFoundError) {
      notFound();
    }
    throw err;
  }

  const [tAgreements, tCommon, tCommitments] = await Promise.all([
    getTranslations({ locale, namespace: "Agreements" }),
    getTranslations({ locale, namespace: "Common" }),
    getTranslations({ locale, namespace: "Commitments" }),
  ]);

  const termsToDisplay =
    approvedVersion?.snapshot.terms || agreement.draft?.content.terms || [];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8 bg-white dark:bg-zinc-950 min-h-screen text-zinc-900 dark:text-zinc-100 print:p-0 print:bg-white print:text-black">
      {/* Top Bar (Hidden when printing) */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 print:hidden">
        <Link
          href={`/${locale}/agreements/${agreement.id}`}
          className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          ← {tAgreements("title")}
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/agreements/${agreement.id}`}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            {tCommon("cancel")}
          </Link>
          <PrintAgreementButton
            label={locale === "ar" ? "طباعة / تصدير PDF" : "Print / Export PDF"}
          />
        </div>
      </div>

      {/* Agreement Header */}
      <div className="border-b-2 border-zinc-900 dark:border-zinc-100 pb-6 space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-500 uppercase tracking-widest font-mono">
          <span>{locale === "ar" ? "وثيقة اتفاق رسمية" : "AGREEMENT DOCUMENT"}</span>
          <span>{agreement.workspace.name}</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight">
          {agreement.title}
        </h1>

        {agreement.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {agreement.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-2">
          <span>
            {locale === "ar" ? "الحالة:" : "Status:"}{" "}
            <strong>{tAgreements(`status.${agreement.lifecycleStatus}`)}</strong>
          </span>
          {approvedVersion && (
            <>
              <span>
                {locale === "ar" ? "النسخة المعتمدة:" : "Approved Version:"}{" "}
                <strong>V{approvedVersion.versionNumber}</strong>
              </span>
              <span>
                {locale === "ar" ? "تاريخ الاعتماد:" : "Approved Date:"}{" "}
                <strong>
                  {approvedVersion.resolvedAt
                    ? new Date(approvedVersion.resolvedAt).toLocaleDateString()
                    : "—"}
                </strong>
              </span>
            </>
          )}
        </div>

        {approvedVersion && (
          <div className="text-[11px] font-mono text-zinc-500 bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded border border-zinc-200 dark:border-zinc-800 break-all">
            SHA-256: {approvedVersion.contentHash}
          </div>
        )}
      </div>

      {/* Participating Parties */}
      <div className="space-y-3">
        <h2 className="text-base font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-1">
          {locale === "ar" ? "أطراف الاتفاق والمراجعون" : "Participating Parties & Reviewers"}
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left rtl:text-right border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                <th className="py-2 px-2">{locale === "ar" ? "الاسم" : "Name"}</th>
                <th className="py-2 px-2">{locale === "ar" ? "البريد الإلكتروني" : "Email"}</th>
                <th className="py-2 px-2">{locale === "ar" ? "الدور" : "Role"}</th>
                <th className="py-2 px-2">{locale === "ar" ? "قرار الاعتماد" : "Decision"}</th>
              </tr>
            </thead>
            <tbody>
              {agreement.participants.map((p) => {
                const reviewer = approvedVersion?.reviewers.find(
                  (r) => r.participantId === p.id
                );

                return (
                  <tr
                    key={p.id}
                    className="border-b border-zinc-100 dark:border-zinc-800/60"
                  >
                    <td className="py-2.5 px-2 font-medium">
                      {p.partyDisplayName}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-zinc-600 dark:text-zinc-400">
                      {p.emailNormalized}
                    </td>
                    <td className="py-2.5 px-2 text-zinc-600 dark:text-zinc-400">
                      {p.agreementRole}
                    </td>
                    <td className="py-2.5 px-2 font-semibold">
                      {reviewer?.decision?.decision === "APPROVE" ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          ✓ {locale === "ar" ? "معتمد" : "Approved"}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Structured Terms */}
      <div className="space-y-4">
        <h2 className="text-base font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-1">
          {locale === "ar" ? "بنود وشروط الاتفاق" : "Terms & Conditions"}
        </h2>

        <div className="space-y-4">
          {termsToDisplay.map((term, index) => (
            <div
              key={term.id}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 bg-zinc-50/50 dark:bg-zinc-900/40"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {index + 1}. {term.title}
                </h3>
                <span className="text-[10px] font-mono text-zinc-400">
                  #{term.id}
                </span>
              </div>

              {term.body && (
                <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {term.body}
                </p>
              )}

              {(term.amount || term.dueDate) && (
                <div className="flex flex-wrap gap-4 text-xs font-mono text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  {term.amount && (
                    <span>
                      {locale === "ar" ? "المبلغ:" : "Amount:"}{" "}
                      <strong>
                        {term.amount} {term.currency || "SAR"}
                      </strong>
                    </span>
                  )}
                  {term.dueDate && (
                    <span>
                      {locale === "ar" ? "الاستحقاق:" : "Due Date:"}{" "}
                      <strong>{term.dueDate}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Commitments Summary */}
      {commitments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-1">
            {tCommitments("title")}
          </h2>

          <div className="space-y-2">
            {commitments.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs"
              >
                <div>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {c.title}
                  </span>
                  {c.assigneeName && (
                    <span className="text-zinc-500 ms-2">
                      ({c.assigneeName})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 font-mono">
                  {c.dueAt && (
                    <span className="text-zinc-500">
                      {new Date(c.dueAt).toLocaleDateString()}
                    </span>
                  )}
                  <span className="font-bold">{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal Trust Disclaimer */}
      <div className="pt-6 border-t-2 border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500 space-y-1">
        <p className="font-medium">
          {locale === "ar"
            ? "تسجيل الموافقة داخل منصة اتفقنا يؤكد قبول الأطراف للشروط المذكورة ولا يمثل توقيعًا إلكترونيًا رسميًا أو توثيقًا حكوميًا."
            : "Approval recorded within the platform confirms acceptance of the terms by participating parties; it does not constitute a certified legal signature."}
        </p>
        <p className="text-[10px] text-zinc-400">
          Etfago Agreement Workspace • Exported on{" "}
          {new Date().toISOString().split("T")[0]}
        </p>
      </div>
    </div>
  );
}
