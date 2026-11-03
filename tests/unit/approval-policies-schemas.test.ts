import { describe, it, expect } from "vitest";
import {
  ApprovalPolicySchema,
  SubmitForReviewSchema,
} from "../../src/lib/schemas/versions";
import { InviteParticipantSchema } from "../../src/lib/schemas/invitations";

describe("Sprint 10 Unit: Approval Policies & Quorum Schemas (F-23)", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";

  it("validates supported approval policy enum values", () => {
    expect(ApprovalPolicySchema.parse("UNANIMOUS")).toBe("UNANIMOUS");
    expect(ApprovalPolicySchema.parse("MAJORITY")).toBe("MAJORITY");
    expect(ApprovalPolicySchema.parse("QUORUM_THRESHOLD")).toBe("QUORUM_THRESHOLD");
    expect(() => ApprovalPolicySchema.parse("UNKNOWN")).toThrow();
  });

  it("defaults SubmitForReview to UNANIMOUS and non-sequential", () => {
    const parsed = SubmitForReviewSchema.parse({
      agreementId: validUuid,
      expectedDraftRevision: 1,
    });
    expect(parsed.approvalPolicy).toBe("UNANIMOUS");
    expect(parsed.isSequential).toBe(false);
    expect(parsed.quorumThreshold).toBeNull();
  });

  it("validates MAJORITY policy with sequential ordering", () => {
    const parsed = SubmitForReviewSchema.parse({
      agreementId: validUuid,
      expectedDraftRevision: 2,
      approvalPolicy: "MAJORITY",
      isSequential: true,
    });
    expect(parsed.approvalPolicy).toBe("MAJORITY");
    expect(parsed.isSequential).toBe(true);
  });

  it("accepts valid QUORUM_THRESHOLD with numeric threshold count", () => {
    const parsed = SubmitForReviewSchema.parse({
      agreementId: validUuid,
      expectedDraftRevision: 1,
      approvalPolicy: "QUORUM_THRESHOLD",
      quorumThreshold: 3,
    });
    expect(parsed.approvalPolicy).toBe("QUORUM_THRESHOLD");
    expect(parsed.quorumThreshold).toBe(3);
  });

  it("rejects QUORUM_THRESHOLD when quorumThreshold is missing or zero", () => {
    expect(() =>
      SubmitForReviewSchema.parse({
        agreementId: validUuid,
        expectedDraftRevision: 1,
        approvalPolicy: "QUORUM_THRESHOLD",
      })
    ).toThrow(/Quorum threshold/);

    expect(() =>
      SubmitForReviewSchema.parse({
        agreementId: validUuid,
        expectedDraftRevision: 1,
        approvalPolicy: "QUORUM_THRESHOLD",
        quorumThreshold: 0,
      })
    ).toThrow();
  });

  it("validates participant invitation stepOrder defaulting to 1", () => {
    const invite = InviteParticipantSchema.parse({
      agreementId: validUuid,
      email: "reviewer@example.com",
      partyDisplayName: "Reviewer Two",
    });
    expect(invite.stepOrder).toBe(1);

    const step2Invite = InviteParticipantSchema.parse({
      agreementId: validUuid,
      email: "finance@example.com",
      partyDisplayName: "Finance Department",
      stepOrder: 2,
    });
    expect(step2Invite.stepOrder).toBe(2);

    expect(() =>
      InviteParticipantSchema.parse({
        agreementId: validUuid,
        email: "bad@example.com",
        partyDisplayName: "Bad Step",
        stepOrder: 0,
      })
    ).toThrow();
  });
});
