import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "../../../../server/auth/session";
import { getAgreementDetail } from "../../../../server/agreements/service";
import {
  getPendingReview,
  getVersionDetail,
  listAgreementVersions,
} from "../../../../server/agreements/versions";
import { listChangeRequests } from "../../../../server/agreements/proposals";
import { listComments } from "../../../../server/agreements/comments";
import { listCommitments } from "../../../../server/commitments/service";
import { listAttachments } from "../../../../server/storage/service";
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
import { ChangeProposalsList } from "../../../../features/agreements/ChangeProposalsList";
import { ProposeChangeModal } from "../../../../features/agreements/ProposeChangeModal";
import { VersionDiffViewer } from "../../../../features/agreements/VersionDiffViewer";
import { CommentThread } from "../../../../features/agreements/CommentThread";
import { CommitmentList } from "../../../../features/commitments/CommitmentList";
import { CreateCommitmentModal } from "../../../../features/commitments/CreateCommitmentModal";
import { AttachmentsCard } from "../../../../features/files/AttachmentsCard";

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
  let proposals: Awaited<ReturnType<typeof listChangeRequests>> = [];
  let comments: Awaited<ReturnType<typeof listComments>> = [];
  let commitments: Awaited<ReturnType<typeof listCommitments>> = [];
  let attachments: Awaited<ReturnType<typeof listAttachments>> = [];

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
    proposals = await listChangeRequests(user.id, id);
    comments = await listComments(user.id, id);
    commitments = await listCommitments(user.id, id);
    attachments = await listAttachments(user.id, id);
  } catch (err: unknown) {
    if (err instanceof ForbiddenError || err instanceof NotFoundError) {
      notFound();
    }
    throw err;
  }

  const [
    tAgreements,
    tTerms,
    tInvitations,
    tCommon,
    tProposals,
    tDiscussions,
    tDiff,
    tCommitments,
    tFiles,
  ] = await Promise.all([
    getTranslations({ locale, namespace: "Agreements" }),
    getTranslations({ locale, namespace: "Terms" }),
    getTranslations({ locale, namespace: "Invitations" }),
    getTranslations({ locale, namespace: "Common" }),
    getTranslations({ locale, namespace: "Proposals" }),
    getTranslations({ locale, namespace: "Discussions" }),
    getTranslations({ locale, namespace: "Diff" }),
    getTranslations({ locale, namespace: "Commitments" }),
    getTranslations({ locale, namespace: "Files" }),
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
      CHANGE_REQUEST_CREATED: tAgreements("actions.CHANGE_REQUEST_CREATED"),
      CHANGE_REQUEST_ACCEPTED: tAgreements("actions.CHANGE_REQUEST_ACCEPTED"),
      CHANGE_REQUEST_DECLINED: tAgreements("actions.CHANGE_REQUEST_DECLINED"),
      CHANGE_REQUEST_CANCELLED: tAgreements("actions.CHANGE_REQUEST_CANCELLED"),
      COMMENT_ADDED: tAgreements("actions.COMMENT_ADDED"),
    },
  };

  const proposalsTranslations = {
    noProposals: tProposals("noProposals"),
    createFirstProposal: tProposals("createFirstProposal"),
    proposedBy: tProposals("proposedBy"),
    termLabel: tProposals("termLabel"),
    reasonLabel: tProposals("reasonLabel"),
    beforeLabel: tProposals("beforeLabel"),
    afterLabel: tProposals("afterLabel"),
    acceptIntoDraft: tProposals("acceptIntoDraft"),
    decline: tProposals("decline"),
    cancelProposal: tProposals("cancelProposal"),
    confirmAccept: tProposals("confirmAccept"),
    confirmDeclineTitle: tProposals("confirmDeclineTitle"),
    declineReasonPlaceholder: tProposals("declineReasonPlaceholder"),
    confirmCancel: tProposals("confirmCancel"),
    status: {
      OPEN: tProposals("status.OPEN"),
      ACCEPTED_IN_DRAFT: tProposals("status.ACCEPTED_IN_DRAFT"),
      DECLINED: tProposals("status.DECLINED"),
      CANCELLED: tProposals("status.CANCELLED"),
    },
    operations: {
      ADD: tProposals("operations.ADD"),
      UPDATE: tProposals("operations.UPDATE"),
      REMOVE: tProposals("operations.REMOVE"),
    },
    loading: tCommon("loading"),
    cancel: tCommon("cancel"),
    filterAll: tProposals("filterAll"),
    filterOpen: tProposals("filterOpen"),
    filterResolved: tProposals("filterResolved"),
  };

  const proposeModalTranslations = {
    proposeChangeButton: tProposals("proposeChangeButton"),
    modalTitle: tProposals("modalTitle"),
    modalSubtitle: tProposals("modalSubtitle"),
    operationLabel: tProposals("operationLabel"),
    operations: {
      UPDATE: tProposals("operations.UPDATE"),
      ADD: tProposals("operations.ADD"),
      REMOVE: tProposals("operations.REMOVE"),
    },
    selectTermLabel: tProposals("selectTermLabel"),
    termTitleLabel: tProposals("termTitleLabel"),
    termBodyLabel: tProposals("termBodyLabel"),
    amountLabel: tProposals("amountLabel"),
    currencyLabel: tProposals("currencyLabel"),
    dueDateLabel: tProposals("dueDateLabel"),
    reasonLabel: tProposals("reasonLabel"),
    reasonPlaceholder: tProposals("reasonPlaceholder"),
    submitProposal: tProposals("submitProposal"),
    cancel: tCommon("cancel"),
    loading: tCommon("loading"),
    disclaimer: tProposals("disclaimer"),
  };

  const commentThreadTranslations = {
    discussionTitle: tDiscussions("discussionTitle"),
    noCommentsYet: tDiscussions("noCommentsYet"),
    addFirstComment: tDiscussions("addFirstComment"),
    postCommentPlaceholder: tDiscussions("postCommentPlaceholder"),
    postCommentButton: tDiscussions("postCommentButton"),
    edit: tDiscussions("edit"),
    delete: tDiscussions("delete"),
    save: tDiscussions("save"),
    cancel: tDiscussions("cancel"),
    edited: tDiscussions("edited"),
    confirmDelete: tDiscussions("confirmDelete"),
    loading: tCommon("loading"),
  };

  const diffViewerTranslations = {
    title: tDiff("title"),
    description: tDiff("description"),
    noDifferences: tDiff("noDifferences"),
    addedCount: tDiff("addedCount"),
    removedCount: tDiff("removedCount"),
    modifiedCount: tDiff("modifiedCount"),
    unchangedCount: tDiff("unchangedCount"),
    filterAll: tDiff("filterAll"),
    filterChangesOnly: tDiff("filterChangesOnly"),
    fields: {
      title: tDiff("fields.title"),
      body: tDiff("fields.body"),
      amount: tDiff("fields.amount"),
      currency: tDiff("fields.currency"),
      dueDate: tDiff("fields.dueDate"),
      assignedParticipantId: tDiff("fields.assignedParticipantId"),
    },
    statuses: {
      ADDED: tDiff("statuses.ADDED"),
      REMOVED: tDiff("statuses.REMOVED"),
      MODIFIED: tDiff("statuses.MODIFIED"),
      UNCHANGED: tDiff("statuses.UNCHANGED"),
    },
    before: tDiff("before"),
    after: tDiff("after"),
  };

  const commitmentTranslations = {
    noCommitments: tCommitments("noCommitments"),
    createFirst: tCommitments("createFirst"),
    needsReviewNotice: tCommitments("needsReviewNotice"),
    status: {
      TODO: tCommitments("status.TODO"),
      IN_PROGRESS: tCommitments("status.IN_PROGRESS"),
      DONE: tCommitments("status.DONE"),
      CANCELLED: tCommitments("status.CANCELLED"),
    },
    assigneeLabel: tCommitments("assigneeLabel"),
    unassigned: tCommitments("unassigned"),
    dueDateLabel: tCommitments("dueDateLabel"),
    noDueDate: tCommitments("noDueDate"),
    delete: tCommitments("delete"),
    confirmDelete: tCommitments("confirmDelete"),
    loading: tCommon("loading"),
  };

  const createCommitmentTranslations = {
    createButton: tCommitments("createButton"),
    modalTitle: tCommitments("modalTitle"),
    modalSubtitle: tCommitments("modalSubtitle"),
    titleLabel: tCommitments("titleLabel"),
    titlePlaceholder: tCommitments("titlePlaceholder"),
    detailsLabel: tCommitments("detailsLabel"),
    detailsPlaceholder: tCommitments("detailsPlaceholder"),
    assigneeLabel: tCommitments("assigneeLabel"),
    noAssignee: tCommitments("noAssignee"),
    dueDateLabel: tCommitments("dueDateLabel"),
    linkTermLabel: tCommitments("linkTermLabel"),
    noLinkedTerm: tCommitments("noLinkedTerm"),
    submit: tCommitments("submit"),
    cancel: tCommon("cancel"),
    loading: tCommon("loading"),
  };

  const attachmentsTranslations = {
    title: tFiles("title"),
    upload: tFiles("upload"),
    uploading: tFiles("uploading"),
    privateStorageNotice: tFiles("privateStorageNotice"),
    allowedFormats: tFiles("allowedFormats"),
    noAttachments: tFiles("noAttachments"),
    uploadedBy: tFiles("uploadedBy"),
    download: tFiles("download"),
    delete: tFiles("delete"),
    confirmDelete: tFiles("confirmDelete"),
  };

  const activeTerms =
    currentApprovedVersion?.snapshot.terms ||
    agreement.draft?.content.terms ||
    [];

  // Terms for Diffing
  const baseDiffTerms = currentApprovedVersion?.snapshot.terms || [];
  const compareDiffTerms =
    pendingReview?.snapshot.terms || agreement.draft?.content.terms || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 px-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-base font-reading text-[var(--dp-color-annotation)]">
        <Link
          href={`/${locale}/agreements`}
          className="hover:text-[var(--dp-color-accent)] hover:underline transition-colors inline-flex items-center gap-1.5"
        >
          <span>←</span>
          <span>{tAgreements("title")}</span>
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
        <div className="p-4 rounded-[8px_4px_12px_5px] bg-[var(--dp-color-highlight)]/40 border-[1.5px] border-[var(--dp-color-line)] shadow-[1px_2px_0px_var(--dp-color-line)] flex items-start gap-3">
          <span className="text-xl leading-none mt-0.5">
            ⚠️
          </span>
          <div>
            <h2 className="text-base font-bold font-marker text-[var(--dp-color-ink)]">
              {tAgreements("draftSubtitle")}
            </h2>
            <p className="text-sm font-reading text-[var(--dp-color-ink-muted)] mt-0.5">
              لا يمثل هذا المحتوى اتفاقًا معتمدًا حتى يتم تجميد النسخة والموافقة الصريحة عليها من جميع الأطراف.
            </p>
          </div>
        </div>
      )}

      {agreement.lifecycleStatus === "ARCHIVED" && (
        <div className="p-4 rounded-[8px_4px_12px_5px] bg-[var(--dp-color-scrap)] border-[1.5px] border-dashed border-[var(--dp-color-line)] text-sm font-reading text-[var(--dp-color-ink-muted)]">
          🗄 {tAgreements("archivedNotice")}
        </div>
      )}

      {/* Agreement Header */}
      <div className="sketch-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
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
                {agreement.workspace.name}
              </span>

              {agreement.category && (
                <span className="text-xs px-2 py-0.5 rounded-[5px_2px_7px_3px] bg-[var(--dp-color-ground)]/60 text-[var(--dp-color-ink-muted)] border border-dashed border-[var(--dp-color-line)] font-reading">
                  {agreement.category}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-marker text-[var(--dp-color-ink)]">
              {agreement.title}
            </h1>

            {agreement.description && (
              <p className="text-base font-reading text-[var(--dp-color-ink-muted)]">
                {agreement.description}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href={`/${locale}/agreements/${agreement.id}/export`}
              target="_blank"
              rel="noopener noreferrer"
              className="sketch-btn sketch-btn-outline px-3 py-1.5 text-xs font-marker"
            >
              <span>🖨️</span>
              <span>{tAgreements("exportSummary")}</span>
            </Link>

            {agreement.lifecycleStatus !== "ARCHIVED" && activeTerms.length > 0 && (
              <ProposeChangeModal
                agreementId={agreement.id}
                baseVersionId={agreement.currentApprovedVersionId}
                terms={activeTerms}
                translations={proposeModalTranslations}
              />
            )}

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
      <div className="flex border-b-[1.5px] border-[var(--dp-color-line)] gap-2 text-sm font-reading overflow-x-auto pb-1">
        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=terms`}
          className={`px-3 py-1.5 rounded-[7px_3px_9px_4px] border-[1.5px] whitespace-nowrap transition-all font-semibold ${
            tab === "terms"
              ? "bg-[var(--dp-color-highlight)] border-[var(--dp-color-ink)] text-[var(--dp-color-ink)] shadow-[1.5px_1.5px_0px_var(--dp-color-ink)] -translate-y-0.5"
              : "border-transparent text-[var(--dp-color-ink-muted)] hover:border-[var(--dp-color-line)] hover:bg-[var(--dp-color-scrap)]"
          }`}
        >
          {tAgreements("tabs.terms")} ({agreement.draft?.content.terms.length || 0})
        </Link>

        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=commitments`}
          className={`px-3 py-1.5 rounded-[7px_3px_9px_4px] border-[1.5px] whitespace-nowrap transition-all font-semibold ${
            tab === "commitments"
              ? "bg-[var(--dp-color-highlight)] border-[var(--dp-color-ink)] text-[var(--dp-color-ink)] shadow-[1.5px_1.5px_0px_var(--dp-color-ink)] -translate-y-0.5"
              : "border-transparent text-[var(--dp-color-ink-muted)] hover:border-[var(--dp-color-line)] hover:bg-[var(--dp-color-scrap)]"
          }`}
        >
          {tAgreements("tabs.commitments")} ({commitments.length})
        </Link>

        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=files`}
          className={`px-3 py-1.5 rounded-[7px_3px_9px_4px] border-[1.5px] whitespace-nowrap transition-all font-semibold ${
            tab === "files"
              ? "bg-[var(--dp-color-highlight)] border-[var(--dp-color-ink)] text-[var(--dp-color-ink)] shadow-[1.5px_1.5px_0px_var(--dp-color-ink)] -translate-y-0.5"
              : "border-transparent text-[var(--dp-color-ink-muted)] hover:border-[var(--dp-color-line)] hover:bg-[var(--dp-color-scrap)]"
          }`}
        >
          {tAgreements("tabs.files")} ({attachments.length})
        </Link>

        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=proposals`}
          className={`px-3 py-1.5 rounded-[7px_3px_9px_4px] border-[1.5px] whitespace-nowrap transition-all font-semibold ${
            tab === "proposals"
              ? "bg-[var(--dp-color-highlight)] border-[var(--dp-color-ink)] text-[var(--dp-color-ink)] shadow-[1.5px_1.5px_0px_var(--dp-color-ink)] -translate-y-0.5"
              : "border-transparent text-[var(--dp-color-ink-muted)] hover:border-[var(--dp-color-line)] hover:bg-[var(--dp-color-scrap)]"
          }`}
        >
          {tAgreements("tabs.proposals")} ({proposals.length})
        </Link>

        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=diff`}
          className={`px-3 py-1.5 rounded-[7px_3px_9px_4px] border-[1.5px] whitespace-nowrap transition-all font-semibold ${
            tab === "diff"
              ? "bg-[var(--dp-color-highlight)] border-[var(--dp-color-ink)] text-[var(--dp-color-ink)] shadow-[1.5px_1.5px_0px_var(--dp-color-ink)] -translate-y-0.5"
              : "border-transparent text-[var(--dp-color-ink-muted)] hover:border-[var(--dp-color-line)] hover:bg-[var(--dp-color-scrap)]"
          }`}
        >
          {tAgreements("tabs.diff")}
        </Link>

        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=discussion`}
          className={`px-3 py-1.5 rounded-[7px_3px_9px_4px] border-[1.5px] whitespace-nowrap transition-all font-semibold ${
            tab === "discussion"
              ? "bg-[var(--dp-color-highlight)] border-[var(--dp-color-ink)] text-[var(--dp-color-ink)] shadow-[1.5px_1.5px_0px_var(--dp-color-ink)] -translate-y-0.5"
              : "border-transparent text-[var(--dp-color-ink-muted)] hover:border-[var(--dp-color-line)] hover:bg-[var(--dp-color-scrap)]"
          }`}
        >
          {tAgreements("tabs.discussion")} ({comments.length})
        </Link>

        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=participants`}
          className={`px-3 py-1.5 rounded-[7px_3px_9px_4px] border-[1.5px] whitespace-nowrap transition-all font-semibold ${
            tab === "participants"
              ? "bg-[var(--dp-color-highlight)] border-[var(--dp-color-ink)] text-[var(--dp-color-ink)] shadow-[1.5px_1.5px_0px_var(--dp-color-ink)] -translate-y-0.5"
              : "border-transparent text-[var(--dp-color-ink-muted)] hover:border-[var(--dp-color-line)] hover:bg-[var(--dp-color-scrap)]"
          }`}
        >
          {tAgreements("tabs.participants")} ({agreement.participants.length})
        </Link>

        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=versions`}
          className={`px-3 py-1.5 rounded-[7px_3px_9px_4px] border-[1.5px] whitespace-nowrap transition-all font-semibold ${
            tab === "versions"
              ? "bg-[var(--dp-color-highlight)] border-[var(--dp-color-ink)] text-[var(--dp-color-ink)] shadow-[1.5px_1.5px_0px_var(--dp-color-ink)] -translate-y-0.5"
              : "border-transparent text-[var(--dp-color-ink-muted)] hover:border-[var(--dp-color-line)] hover:bg-[var(--dp-color-scrap)]"
          }`}
        >
          {tAgreements("tabs.versions")} ({versions.length})
        </Link>

        <Link
          href={`/${locale}/agreements/${agreement.id}?tab=activity`}
          className={`px-3 py-1.5 rounded-[7px_3px_9px_4px] border-[1.5px] whitespace-nowrap transition-all font-semibold ${
            tab === "activity"
              ? "bg-[var(--dp-color-highlight)] border-[var(--dp-color-ink)] text-[var(--dp-color-ink)] shadow-[1.5px_1.5px_0px_var(--dp-color-ink)] -translate-y-0.5"
              : "border-transparent text-[var(--dp-color-ink-muted)] hover:border-[var(--dp-color-line)] hover:bg-[var(--dp-color-scrap)]"
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
              <div className="sketch-strip p-4 text-xs font-reading text-[var(--dp-color-annotation)] flex items-center gap-2">
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

        {tab === "commitments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-marker text-[var(--dp-color-ink)]">
                  {tCommitments("title")}
                </h3>
                <p className="text-xs font-reading text-[var(--dp-color-ink-muted)]">
                  {tCommitments("subtitle")}
                </p>
              </div>

              {agreement.canEdit && agreement.lifecycleStatus !== "ARCHIVED" && (
                <CreateCommitmentModal
                  agreementId={agreement.id}
                  sourceVersionId={agreement.currentApprovedVersionId}
                  participants={agreement.participants}
                  terms={activeTerms}
                  translations={createCommitmentTranslations}
                />
              )}
            </div>

            <CommitmentList
              agreementId={agreement.id}
              commitments={commitments}
              currentUserId={user.id}
              isOrganizer={agreement.isOrganizer}
              canEdit={agreement.canEdit && agreement.lifecycleStatus !== "ARCHIVED"}
              translations={commitmentTranslations}
            />
          </div>
        )}

        {tab === "files" && (
          <AttachmentsCard
            agreementId={agreement.id}
            attachments={attachments}
            currentUserId={user.id}
            isOrganizer={agreement.isOrganizer}
            translations={attachmentsTranslations}
          />
        )}

        {tab === "proposals" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-marker text-[var(--dp-color-ink)]">
                  {tProposals("title")}
                </h3>
                <p className="text-xs font-reading text-[var(--dp-color-ink-muted)]">
                  {tProposals("subtitle")}
                </p>
              </div>

              {agreement.lifecycleStatus !== "ARCHIVED" && activeTerms.length > 0 && (
                <ProposeChangeModal
                  agreementId={agreement.id}
                  baseVersionId={agreement.currentApprovedVersionId}
                  terms={activeTerms}
                  translations={proposeModalTranslations}
                />
              )}
            </div>

            <ChangeProposalsList
              agreementId={agreement.id}
              proposals={proposals}
              currentUserId={user.id}
              isOrganizer={agreement.isOrganizer}
              canEdit={agreement.canEdit && !pendingReview}
              translations={proposalsTranslations}
            />
          </div>
        )}

        {tab === "diff" && (
          <VersionDiffViewer
            baseVersionNumber={currentApprovedVersion?.versionNumber}
            compareVersionNumber={
              pendingReview?.versionNumber ?? (agreement.draft ? "Draft" : undefined)
            }
            baseTerms={baseDiffTerms}
            compareTerms={compareDiffTerms}
            translations={diffViewerTranslations}
          />
        )}

        {tab === "discussion" && (
          <CommentThread
            agreementId={agreement.id}
            versionId={agreement.currentApprovedVersionId}
            comments={comments}
            currentUserId={user.id}
            isOrganizer={agreement.isOrganizer}
            translations={commentThreadTranslations}
          />
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
