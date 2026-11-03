-- CreateEnum
CREATE TYPE "ApprovalPolicy" AS ENUM ('UNANIMOUS', 'MAJORITY', 'QUORUM_THRESHOLD');

-- AlterTable
ALTER TABLE "AgreementDraft" ADD COLUMN     "approvalPolicy" "ApprovalPolicy" NOT NULL DEFAULT 'UNANIMOUS',
ADD COLUMN     "isSequential" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quorumThreshold" INTEGER;

-- AlterTable
ALTER TABLE "AgreementParticipant" ADD COLUMN     "stepOrder" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "AgreementVersion" ADD COLUMN     "approvalPolicy" "ApprovalPolicy" NOT NULL DEFAULT 'UNANIMOUS',
ADD COLUMN     "isSequential" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quorumThreshold" INTEGER;

-- AlterTable
ALTER TABLE "VersionReviewer" ADD COLUMN     "stepOrder" INTEGER NOT NULL DEFAULT 1;
