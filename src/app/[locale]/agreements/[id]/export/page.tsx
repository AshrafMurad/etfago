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
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8 bg-[var(--dp-color-ground)] min-h-screen text-[var(--dp-color-ink)] print:p-0 print:bg-white print:text-black">
      {/* Top Bar (Hidden when printing) */}
      <div className="flex items-center justify-between border-b border-[var(--dp-color-line)] pb-4 print:hidden">
        <Link
          href={`/${locale}/agreements/${agreement.id}`}
          className="text-sm font-bold font-marker text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] transition-colors"
        >
          ← {tAgreements("title")}
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/agreements/${agreement.id}`}
            className="sketch-btn sketch-btn-outline text-xs px-3.5 py-1.5"
          >
            {tCommon("cancel")}
          </Link>
          <PrintAgreementButton
            label={locale === "ar" ? "طباعة / تصدير PDF" : "Print / Export PDF"}
          />
        </div>
      </div>

      {/* Agreement Header */}
      <div className="border-b-2 border-[var(--dp-color-ink)] pb-6 space-y-3">
        <div className="flex items-center justify-between text-xs text-[var(--dp-color-ink-muted)] uppercase tracking-widest font-marker">
          <span>{locale === "ar" ? "وثيقة اتفاق رسمية" : "AGREEMENT DOCUMENT"}</span>
          <span>{agreement.workspace.name}</span>
        </div>

        <h1 className="text-3xl font-extrabold font-marker tracking-tight text-[var(--dp-color-ink)]">
          {agreement.title}
        </h1>

        {agreement.description && (
          <p className="text-sm font-reading text-[var(--dp-color-ink-muted)] leading-relaxed">
            {agreement.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs font-marker pt-2">
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
          <div className="text-[11px] font-mono text-[var(--dp-color-ink-muted)] bg-[var(--dp-color-scrap)] p-2.5 rounded-[4px_2px_5px_3px] border border-[var(--dp-color-line)] break-all">
            SHA-256: {approvedVersion.contentHash}
          </div>
        )}
      </div>

      {/* Participating Parties */}
      <div className="space-y-3">
        <h2 className="text-base font-bold font-marker uppercase tracking-wider text-[var(--dp-color-ink)] border-b border-[var(--dp-color-line)] pb-1">
          {locale === "ar" ? "أطراف الاتفاق والمراجعون" : "Participating Parties & Reviewers"}
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left rtl:text-right border-collapse">
            <thead>
              <tr className="border-b border-[var(--dp-color-line)] text-[var(--dp-color-ink-muted)] font-marker font-bold">
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
                    className="border-b border-[var(--dp-color-line)]/50 font-reading"
                  >
                    <td className="py-2.5 px-2 font-bold font-marker text-[var(--dp-color-ink)]">
                      {p.partyDisplayName}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[var(--dp-color-ink-muted)]">
                      {p.emailNormalized}
                    </td>
                    <td className="py-2.5 px-2 text-[var(--dp-color-ink-muted)]">
                      {p.agreementRole}
                    </td>
                    <td className="py-2.5 px-2 font-bold font-marker">
                      {reviewer?.decision?.decision === "APPROVE" ? (
                        <span className="text-[#3c6b44]">
                          ✓ {locale === "ar" ? "معتمد" : "Approved"}
                        </span>
                      ) : (
                        <span className="text-[var(--dp-color-ink-muted)]">—</span>
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
        <h2 className="text-base font-bold font-marker uppercase tracking-wider text-[var(--dp-color-ink)] border-b border-[var(--dp-color-line)] pb-1">
          {locale === "ar" ? "بنود وشروط الاتفاق" : "Terms & Conditions"}
        </h2>

        <div className="space-y-4">
          {termsToDisplay.map((term, index) => (
            <div
              key={term.id}
              className="p-4 rounded-[8px_4px_12px_5px] border border-[var(--dp-color-line)] space-y-2 bg-[var(--dp-color-scrap)] shadow-[1px_1px_0px_var(--dp-color-line)]"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold font-marker text-sm text-[var(--dp-color-ink)]">
                  {index + 1}. {term.title}
                </h3>
                <span className="text-[10px] font-mono text-[var(--dp-color-ink-muted)]">
                  #{term.id}
                </span>
              </div>

              {term.body && (
                <p className="text-xs font-reading text-[var(--dp-color-ink)] whitespace-pre-wrap leading-relaxed">
                  {term.body}
                </p>
              )}

              {(term.amount || term.dueDate) && (
                <div className="flex flex-wrap gap-4 text-xs font-mono text-[var(--dp-color-ink-muted)] pt-1 border-t border-[var(--dp-color-line)]/50">
                  {term.amount && (
                    <span>
                      {locale === "ar" ? "المبلغ:" : "Amount:"}{" "}
                      <strong className="text-[var(--dp-color-ink)]">
                        {term.amount} {term.currency || "SAR"}
                      </strong>
                    </span>
                  )}
                  {term.dueDate && (
                    <span>
                      {locale === "ar" ? "الاستحقاق:" : "Due Date:"}{" "}
                      <strong className="text-[var(--dp-color-ink)]">{term.dueDate}</strong>
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
          <h2 className="text-base font-bold font-marker uppercase tracking-wider text-[var(--dp-color-ink)] border-b border-[var(--dp-color-line)] pb-1">
            {tCommitments("title")}
          </h2>

          <div className="space-y-2">
            {commitments.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-xs"
              >
                <div>
                  <span className="font-bold font-marker text-[var(--dp-color-ink)]">
                    {c.title}
                  </span>
                  {c.assigneeName && (
                    <span className="text-[var(--dp-color-ink-muted)] ms-2 font-reading">
                      ({c.assigneeName})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 font-mono">
                  {c.dueAt && (
                    <span className="text-[var(--dp-color-ink-muted)]">
                      {new Date(c.dueAt).toLocaleDateString()}
                    </span>
                  )}
                  <span className="font-bold font-marker">{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal Trust Disclaimer */}
      <div className="pt-6 border-t-2 border-dashed border-[var(--dp-color-line)] text-center text-xs text-[var(--dp-color-ink-muted)] font-reading space-y-1">
        <p className="font-medium">
          {locale === "ar"
            ? "تسجيل الموافقة داخل منصة اتفقنا يؤكد قبول الأطراف للشروط المذكورة ولا يمثل توقيعًا إلكترونيًا رسميًا أو توثيقًا حكوميًا."
            : "Approval recorded within the platform confirms acceptance of the terms by participating parties; it does not constitute a certified legal signature."}
        </p>
        <p className="text-[10px] text-[var(--dp-color-ink-muted)] font-mono">
          Etfago Agreement Workspace • Exported on{" "}
          {new Date().toISOString().split("T")[0]}
        </p>
      </div>
    </div>
  );
}
