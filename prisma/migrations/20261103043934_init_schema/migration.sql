-- CreateEnum
CREATE TYPE "WorkspaceKind" AS ENUM ('PERSONAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "AgreementLifecycleStatus" AS ENUM ('DRAFT', 'AGREED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PartyKind" AS ENUM ('PERSON', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "AgreementRole" AS ENUM ('ORGANIZER', 'EDITOR', 'REVIEWER', 'OBSERVER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VersionState" AS ENUM ('IN_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ReviewDecisionType" AS ENUM ('APPROVE', 'REQUEST_CHANGES');

-- CreateEnum
CREATE TYPE "ChangeOperation" AS ENUM ('ADD', 'UPDATE', 'REMOVE');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('OPEN', 'ACCEPTED_IN_DRAFT', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttachmentState" AS ENUM ('PENDING', 'READY', 'DELETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboxState" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "emailNormalized" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "kind" "WorkspaceKind" NOT NULL DEFAULT 'PERSONAL',
    "name" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "organizerUserId" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(4000),
    "category" VARCHAR(64),
    "lifecycleStatus" "AgreementLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "currentApprovedVersionId" TEXT,
    "pendingReviewVersionId" TEXT,
    "rowRevision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementParticipant" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "userId" TEXT,
    "emailNormalized" TEXT NOT NULL,
    "partyDisplayName" VARCHAR(120) NOT NULL,
    "partyKind" "PartyKind" NOT NULL DEFAULT 'PERSON',
    "agreementRole" "AgreementRole" NOT NULL DEFAULT 'REVIEWER',
    "requiredByDefault" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementInvitation" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "invitedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementDraft" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "basedOnVersionId" TEXT,
    "contentJson" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedByUserId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgreementDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementVersion" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "basedOnVersionId" TEXT,
    "snapshotJson" JSONB NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "state" "VersionState" NOT NULL DEFAULT 'IN_REVIEW',
    "submittedByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AgreementVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionReviewer" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailSnapshot" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "partyKindSnapshot" TEXT NOT NULL,
    "roleSnapshot" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersionReviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "versionReviewerId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "actingUserId" TEXT NOT NULL,
    "decision" "ReviewDecisionType" NOT NULL,
    "reason" VARCHAR(2000),
    "versionHashSnapshot" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "baseVersionId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "termId" VARCHAR(64) NOT NULL,
    "operation" "ChangeOperation" NOT NULL,
    "oldTermJson" JSONB,
    "newTermJson" JSONB,
    "reason" VARCHAR(2000),
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "versionId" TEXT,
    "termId" VARCHAR(64),
    "authorUserId" TEXT NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commitment" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "sourceVersionId" TEXT,
    "sourceTermId" VARCHAR(64),
    "title" VARCHAR(160) NOT NULL,
    "details" VARCHAR(4000),
    "assigneeParticipantId" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "CommitmentStatus" NOT NULL DEFAULT 'TODO',
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rowRevision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Commitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "versionId" TEXT,
    "originalFilename" VARCHAR(255) NOT NULL,
    "storageKey" VARCHAR(128) NOT NULL,
    "mimeDetected" VARCHAR(100) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "state" "AttachmentState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" VARCHAR(64) NOT NULL,
    "versionId" TEXT,
    "objectId" TEXT,
    "summaryJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "eventKey" VARCHAR(128) NOT NULL,
    "recipientUserId" TEXT,
    "recipientEmailNormalized" TEXT NOT NULL,
    "template" VARCHAR(64) NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "state" "OutboxState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailNormalized_key" ON "User"("emailNormalized");

-- CreateIndex
CREATE INDEX "Workspace_ownerUserId_idx" ON "Workspace"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Agreement_workspaceId_updatedAt_idx" ON "Agreement"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "Agreement_organizerUserId_updatedAt_idx" ON "Agreement"("organizerUserId", "updatedAt");

-- CreateIndex
CREATE INDEX "AgreementParticipant_userId_agreementId_idx" ON "AgreementParticipant"("userId", "agreementId");

-- CreateIndex
CREATE INDEX "AgreementParticipant_agreementId_emailNormalized_idx" ON "AgreementParticipant"("agreementId", "emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementInvitation_tokenHash_key" ON "AgreementInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "AgreementInvitation_agreementId_emailNormalized_idx" ON "AgreementInvitation"("agreementId", "emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementDraft_agreementId_key" ON "AgreementDraft"("agreementId");

-- CreateIndex
CREATE INDEX "AgreementVersion_agreementId_versionNumber_idx" ON "AgreementVersion"("agreementId", "versionNumber" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AgreementVersion_agreementId_versionNumber_key" ON "AgreementVersion"("agreementId", "versionNumber");

-- CreateIndex
CREATE INDEX "VersionReviewer_versionId_required_idx" ON "VersionReviewer"("versionId", "required");

-- CreateIndex
CREATE UNIQUE INDEX "VersionReviewer_versionId_participantId_key" ON "VersionReviewer"("versionId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewDecision_versionReviewerId_key" ON "ReviewDecision"("versionReviewerId");

-- CreateIndex
CREATE INDEX "ReviewDecision_versionId_idx" ON "ReviewDecision"("versionId");

-- CreateIndex
CREATE INDEX "ChangeRequest_agreementId_status_idx" ON "ChangeRequest"("agreementId", "status");

-- CreateIndex
CREATE INDEX "Comment_agreementId_versionId_idx" ON "Comment"("agreementId", "versionId");

-- CreateIndex
CREATE INDEX "Commitment_agreementId_status_idx" ON "Commitment"("agreementId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");

-- CreateIndex
CREATE INDEX "Attachment_agreementId_state_idx" ON "Attachment"("agreementId", "state");

-- CreateIndex
CREATE INDEX "ActivityEvent_agreementId_createdAt_idx" ON "ActivityEvent"("agreementId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_eventKey_key" ON "NotificationOutbox"("eventKey");

-- CreateIndex
CREATE INDEX "NotificationOutbox_state_nextAttemptAt_idx" ON "NotificationOutbox"("state", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementParticipant" ADD CONSTRAINT "AgreementParticipant_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementParticipant" ADD CONSTRAINT "AgreementParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementInvitation" ADD CONSTRAINT "AgreementInvitation_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementDraft" ADD CONSTRAINT "AgreementDraft_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementVersion" ADD CONSTRAINT "AgreementVersion_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionReviewer" ADD CONSTRAINT "VersionReviewer_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "AgreementVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_versionReviewerId_fkey" FOREIGN KEY ("versionReviewerId") REFERENCES "VersionReviewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
