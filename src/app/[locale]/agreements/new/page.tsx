import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "../../../../server/auth/session";
import { listUserWorkspaces } from "../../../../server/workspaces/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateAgreementForm } from "../../../../features/agreements/CreateAgreementForm";

interface NewAgreementPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewAgreementPage({ params }: NewAgreementPageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  const [workspaces, tAgreements, tTerms, tCommon] = await Promise.all([
    listUserWorkspaces(user.id),
    getTranslations({ locale, namespace: "Agreements" }),
    getTranslations({ locale, namespace: "Terms" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  if (workspaces.length === 0) {
    redirect(`/${locale}/workspaces`);
  }

  const formTranslations = {
    titleLabel: tAgreements("titleLabel"),
    titlePlaceholder: tAgreements("titlePlaceholder"),
    descriptionLabel: tAgreements("descriptionLabel"),
    descriptionPlaceholder: tAgreements("descriptionPlaceholder"),
    categoryLabel: tAgreements("categoryLabel"),
    categoryPlaceholder: tAgreements("categoryPlaceholder"),
    workspaceSelect: tAgreements("workspaceSelect"),
    addTerm: tTerms("addTerm"),
    termTitle: tTerms("termTitle"),
    termTitlePlaceholder: tTerms("termTitlePlaceholder"),
    termBody: tTerms("termBody"),
    termBodyPlaceholder: tTerms("termBodyPlaceholder"),
    amount: tTerms("amount"),
    currency: tTerms("currency"),
    dueDate: tTerms("dueDate"),
    removeTerm: tAgreements("removeTerm"),
    save: tCommon("save"),
    cancel: tCommon("cancel"),
    loading: tCommon("loading"),
    optional: tCommon("optional"),
    required: tCommon("required"),
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link
          href={`/${locale}/agreements`}
          className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          ← {tAgreements("title")}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {tAgreements("createTitle")}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {tAgreements("createSubtitle")}
        </p>
      </div>

      <CreateAgreementForm
        locale={locale}
        workspaces={workspaces.map((w) => ({
          id: w.id,
          name: w.name,
          kind: w.kind,
        }))}
        translations={formTranslations}
      />
    </div>
  );
}
