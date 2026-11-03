import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "../../../../server/auth/session";
import { getAgreementDetail } from "../../../../server/agreements/service";
import {
  getPendingReview,
  getVersionDetail,
  listAgreementVersions,
} from "../../../../server/agreements/versions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ForbiddenError, NotFoundError } from "../../../../lib/errors";
import { DraftEditor } from "../../../../features/agreements/DraftEditor";
import { AgreementMetadataEditor } from "../../../../features/agreements/AgreementMetadataEditor";
import { AgreementArchiveButton } from "../../../../features/agreements/AgreementArchiveButton";
import { AgreementParticipantsCard } from "../../../../features/agreements/AgreementParticipantsCard";
import { ActivityTimeline } from "../../../../features/agreements/ActivityTimeline";
import { VersionReviewBanner } from "../../../../features/agreements/VersionReviewBanner";
import { CurrentApprovedVersionCard } from "../../../../features/agreements/CurrentApprovedVersionCard";
import { SubmitForReviewModal } from "../../../../features/agreements/SubmitForReviewModal";
import { VersionHistoryList } from "../../../../features/agreements/VersionHistoryList";

interface AgreementDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function AgreementDetailPage({
  params,
  searchParams,
}: AgreementDetailPageProps) {
  const { locale, id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  const { tab = "terms" } = await searchParams;

  let agreement;
  let pendingReview = null;
  let currentApprovedVersion = null;
  let versions: Awaited<ReturnType<typeof listAgreementVersions>> = [];

  try {
    agreement = await getAgreementDetail(user.id, id);
    pendingReview = await getPendingReview(user.id, id);
    if (agreement.currentApprovedVersionId) {
      currentApprovedVersion = await getVersionDetail(
        user.id,
        id,
        agreement.currentApprovedVersionId
      );
    }
    versions = await listAgreementVersions(user.id, id);
  } catch (err: unknown) {
    if (err instanceof ForbiddenError || err instanceof NotFoundError) {
      notFound();
    }
    throw err;
  }

  const [tAgreements, tTerms, tInvitations, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Agreements" }),
    getTranslations({ locale, namespace: "Terms" }),
    getTranslations({ locale, namespace: "Invitations" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  const draftEditorTranslations = {
    addTerm: tTerms("addTerm"),
    termTitle: tTerms("termTitle"),
    termTitlePlaceholder: tTerms("termTitlePlaceholder"),
    termBody: tTerms("termBody"),
    termBodyPlaceholder: tTerms("termBodyPlaceholder"),
    amount: tTerms("amount"),
    currency: tTerms("currency"),
    dueDate: tTerms("dueDate"),
    saveDraft: tAgreements("saveDraft"),
    saving: tAgreements("saving"),
    saved: tAgreements("saved"),
    revision: tAgreements("revision"),
    unsavedChanges: tAgreements("unsavedChanges"),
    conflictError: tAgreements("conflictError"),
    reload: tAgreements("reload"),
    moveUp: tAgreements("moveUp"),
    moveDown: tAgreements("moveDown"),
    removeTerm: tAgreements("removeTerm"),
    noTermsYet: tAgreements("noTermsYet"),
    addFirstTerm: tAgreements("addFirstTerm"),
  };

  const metadataEditorTranslations = {
    rename: tAgreements("rename"),
    titleLabel: tAgreements("titleLabel"),
    descriptionLabel: tAgreements("descriptionLabel"),
    categoryLabel: tAgreements("categoryLabel"),
    save: tCommon("save"),
    cancel: tCommon("cancel"),
    loading: tCommon("loading"),
    optional: tCommon("optional"),
  };

  const archiveButtonTranslations = {
    archive: tAgreements("archive"),
    restore: tAgreements("restore"),
    loading: tCommon("loading"),
  };

  const participantsTranslations = {
    organizerRole: tAgreements("organizerRole"),
    participantRole: tAgreements("participantRole"),
    upcomingSprintNotice: tAgreements("upcomingSprintNotice"),
    inviteParty: tInvitations("inviteParty"),
    emailLabel: tInvitations("emailLabel"),
    emailPlaceholder: tInvitations("emailPlaceholder"),
    partyDisplayName: tInvitations("partyDisplayName"),
    partyDisplayNamePlaceholder: tInvitations("partyDisplayNamePlaceholder"),
    partyKind: tInvitations("partyKind"),
    person: tInvitations("person"),
    organization: tInvitations("organization"),
    role: tInvitations("role"),
    roles: {
      ORGANIZER: tInvitations("roles.ORGANIZER"),
      EDITOR: tInvitations("roles.EDITOR"),
      REVIEWER: tInvitations("roles.REVIEWER"),
      OBSERVER: tInvitations("roles.OBSERVER"),
    },
    requiredByDefault: tInvitations("requiredByDefault"),
    sendInvite: tInvitations("sendInvite"),
    resend: tInvitations("resend"),
    remove: tInvitations("remove"),
    joined: tInvitations("joined"),
    pending: tInvitations("pending"),
    cancel: tCommon("cancel"),
    loading: tCommon("loading"),
  };

  const reviewBannerTranslations = {
    pendingReviewVersion: tAgreements("pendingReviewVersion"),
    awaitingApproval: tAgreements("awaitingApproval"),
    waitingOnReviewers: tAgreements("waitingOnReviewers"),
    recordApproval: tAgreements("recordApproval"),
    requestChanges: tAgreements("requestChanges"),
    withdrawReview: tAgreements("withdrawReview"),
    withdrawConfirm: tAgreements("withdrawConfirm"),
    withdrawReasonPlaceholder: tAgreements("withdrawReasonPlaceholder"),
    requestChangesTitle: tAgreements("requestChangesTitle"),
    requestChangesDesc: tAgreements("requestChangesDesc"),
    requestChangesReasonLabel: tAgreements("requestChangesReasonLabel"),
    requestChangesReasonPlaceholder: tAgreements("requestChangesReasonPlaceholder"),
    approveTitle: tAgreements("approveTitle"),
    approveDesc: tAgreements("approveDesc"),
    unanimousNotice: tAgreements("unanimousNotice"),
    hashLabel: tAgreements("hashLabel"),
    copyHash: tAgreements("copyHash"),
    approvalNotice: tAgreements("approvalNotice"),
    cancel: tCommon("cancel"),
    loading: tCommon("loading"),
    disclaimer: tCommon("disclaimer"),
    roles: {
      ORGANIZER: tInvitations("roles.ORGANIZER"),
      EDITOR: tInvitations("roles.EDITOR"),
      REVIEWER: tInvitations("roles.REVIEWER"),
      OBSERVER: tInvitations("roles.OBSERVER"),
    },
  };

  const currentApprovedTranslations = {
    currentAgreedVersion: tAgreements("currentAgreedVersion"),
    hashLabel: tAgreements("hashLabel"),
    copyHash: tAgreements("copyHash"),
    disclaimer: tCommon("disclaimer"),
    versionTermsSnapshot: tAgreements("versionTermsSnapshot"),
  };

  const submitModalTranslations = {
    submitForReview: tAgreements("submitForReview"),
    submitDraftTitle: tAgreements("submitDraftTitle"),
    submitDraftDesc: tAgreements("submitDraftDesc"),
    quorumWarning: tAgreements("quorumWarning"),
    frozenRosterLabel: tAgreements("frozenRosterLabel"),
    approvalNotice: tAgreements("approvalNotice"),
    cancel: tCommon("cancel"),
    loading: tCommon("loading"),
    termsCount: tAgreements("termsCount"),
  };

  const versionHistoryTranslations = {
    versionHistoryTitle: tAgreements("versionHistoryTitle"),
    versionHistoryDesc: tAgreements("versionHistoryDesc"),
    noVersionsYet: tAgreements("noVersionsYet"),
    amendFromVersion: tAgreements("amendFromVersion"),
    versionTermsSnapshot: tAgreements("versionTermsSnapshot"),
    hashLabel: tAgreements("hashLabel"),
    copyHash: tAgreements("copyHash"),
    versionState: {
      IN_REVIEW: tAgreements("versionState.IN_REVIEW"),
      APPROVED: tAgreements("versionState.APPROVED"),
      REJECTED: tAgreements("versionState.REJECTED"),
      WITHDRAWN: tAgreements("versionState.WITHDRAWN"),
      SUPERSEDED: tAgreements("versionState.SUPERSEDED"),
    },
    loading: tCommon("loading"),
  };

  const activityTranslations = {
    noActivityYet: tAgreements("noActivityYet"),
    actions: {
      AGREEMENT_CREATED: tAgreements("actions.AGREEMENT_CREATED"),
      DRAFT_UPDATED: tAgreements("actions.DRAFT_UPDATED"),
      AGREEMENT_METADATA_UPDATED: tAgreements("actions.AGREEMENT_METADATA_UPDATED"),
      AGREEMENT_ARCHIVED: tAgreements("actions.AGREEMENT_ARCHIVED"),
      AGREEMENT_RESTORED: tAgreements("actions.AGREEMENT_RESTORED"),
      PARTICIPANT_INVITED: tAgreements("actions.PARTICIPANT_INVITED"),
      INVITATION_RESENT: tAgreements("actions.INVITATION_RESENT"),
      PARTICIPANT_REMOVED: tAgreements("actions.PARTICIPANT_REMOVED"),
      PARTICIPANT_ROLE_UPDATED: tAgreements("actions.PARTICIPANT_ROLE_UPDATED"),
      PARTICIPANT_JOINED: tAgreements("actions.PARTICIPANT_JOINED"),
      VERSION_SUBMITTED_FOR_REVIEW: tAgreements("actions.VERSION_SUBMITTED_FOR_REVIEW"),
      REVIEW_APPROVED: tAgreements("actions.REVIEW_APPROVED"),
      REVIEW_CHANGES_REQUESTED: tAgreements("actions.REVIEW_CHANGES_REQUESTED"),
      VERSION_REJECTED: tAgreements("actions.VERSION_REJECTED"),
      VERSION_PROMOTED_TO_AGREED: tAgreements("actions.VERSION_PROMOTED_TO_AGREED"),
      VERSION_WITHDRAWN: tAgreements("actions.VERSION_WITHDRAWN"),
      DRAFT_RESET_FROM_VERSION: tAgreements("actions.DRAFT_RESET_FROM_VERSION"),
    },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link
          href={`/${locale}/agreements`}
          className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          ← {tAgreements("title")}
        </Link>
      </div>

      {/* Pending Review Banner */}
      {pendingReview && (
        <VersionReviewBanner
          agreementId={agreement.id}
          version={pendingReview}
          currentUserId={user.id}
          isOrganizer={agreement.isOrganizer}
          translations={reviewBannerTranslations}
        />
      )}

      {/* Current Approved Version Card */}
      {currentApprovedVersion && (
        <CurrentApprovedVersionCard
          version={currentApprovedVersion}
          translations={currentApprovedTranslations}
        />
      )}

      {/* Draft Status Notice (F-10 Invariant: Never present draft as agreed!) */}
      {agreement.lifecycleStatus === "DRAFT" && !pendingReview && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <span className="text-amber-600 dark:text-amber-400 text-lg leading-none mt-0.5">
            ⚠️
          </span>
          <div>
            <h2 className="text-sm font-bold text-amber-800 dark:text-amber-200">
              {tAgreements("draftSubtitle")}
            </h2>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
              لا يمثل هذا المحتوى اتفاقًا معتمدًا حتى يتم تجميد النسخة والموافقة الصريحة عليها من جميع الأطراف.
            </p>
          </div>
        </div>
      )}

      {agreement.lifecycleStatus === "ARCHIVED" && (
        <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300">
          🗄 {tAgreements("archivedNotice")}
        </div>
      )}

      {/* Agreement Header */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                  agreement.lifecycleStatus === "DRAFT"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200"
                }`}
              >
                {tAgreements(`status.${agreement.lifecycleStatus}`)}
              </span>

              <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {agreement.workspace.name}
              </span>

              {agreement.category && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                  {agreement.category}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {agreement.title}
            </h1>

            {agreement.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {agreement.description}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {agreement.isOrganizer &&
              !pendingReview &&
              agreement.lifecycleStatus !== "ARCHIVED" &&
              agreement.draft && (
                <SubmitForReviewModal
                  agreementId={agreement.id}
                  draftRevision={agreement.draft.revision}
                  termsCount={agreement.draft.content.terms.length}
                  participants={agreement.participants}
                  translations={submitModalTranslations}
                />
              )}

            {agreement.canEdit && (
              <AgreementMetadataEditor
                agreementId={agreement.id}
                initialTitle={agreement.title}
                initialDescription={agreement.description}
                initialCategory={agreement.category}
                translations={metadataEditorTranslations}
              />
            )}

            {agreement.isOrganizer && (
              <AgreementArchiveButton
                agreementId={agreement.id}
                isArchived={agreement.lifecycleStatus === "ARCHIVED"}
                translations={archiveButtonTranslations}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-6 text-sm font-medium">
        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=terms`}
          className={`pb-3 border-b-2 transition-colors ${
            tab === "terms"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          {tAgreements("tabs.terms")} ({agreement.draft?.content.terms.length || 0})
        </Link>

        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=participants`}
          className={`pb-3 border-b-2 transition-colors ${
            tab === "participants"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          {tAgreements("tabs.participants")} ({agreement.participants.length})
        </Link>

        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=versions`}
          className={`pb-3 border-b-2 transition-colors ${
            tab === "versions"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          {tAgreements("tabs.versions")} ({versions.length})
        </Link>

        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=activity`}
          className={`pb-3 border-b-2 transition-colors ${
            tab === "activity"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          {tAgreements("tabs.activity")} ({agreement.recentActivity.length})
        </Link>
      </div>

      {/* Tab Contents */}
      <div>
        {tab === "terms" && (
          <div className="space-y-4">
            {pendingReview && (
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
                🔒 {tAgreements("lockedDraftNotice").replace("{versionNumber}", String(pendingReview.versionNumber))}
              </div>
            )}

            {agreement.draft && (
              <DraftEditor
                agreementId={agreement.id}
                initialRevision={agreement.draft.revision}
                initialContent={agreement.draft.content}
                canEdit={agreement.canEdit && !pendingReview}
                translations={draftEditorTranslations}
              />
            )}
          </div>
        )}

        {tab === "participants" && (
          <AgreementParticipantsCard
            agreementId={agreement.id}
            isOrganizer={agreement.isOrganizer}
            participants={agreement.participants}
            translations={participantsTranslations}
          />
        )}

        {tab === "versions" && (
          <VersionHistoryList
            agreementId={agreement.id}
            versions={versions}
            isOrganizer={agreement.isOrganizer}
            canAmend={agreement.canEdit && !pendingReview}
            translations={versionHistoryTranslations}
          />
        )}

        {tab === "activity" && (
          <ActivityTimeline
            activity={agreement.recentActivity}
            locale={locale}
            translations={activityTranslations}
          />
        )}
      </div>
    </div>
  );
}
