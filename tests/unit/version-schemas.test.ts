import { describe, it, expect } from "vitest";
import {
  SubmitForReviewSchema,
  RecordReviewDecisionSchema,
  WithdrawReviewSchema,
  ResetDraftFromVersionSchema,
} from "../../src/lib/schemas/versions";

describe("Version & Review Schemas Validation", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";
  const validHash = "a".repeat(64);

  describe("SubmitForReviewSchema", () => {
    it("accepts valid submission payload", () => {
      const res = SubmitForReviewSchema.safeParse({
        agreementId: validUuid,
        expectedDraftRevision: 2,
      });
      expect(res.success).toBe(true);
    });

    it("rejects non-uuid or revision < 1", () => {
      expect(
        SubmitForReviewSchema.safeParse({
          agreementId: "not-a-uuid",
          expectedDraftRevision: 1,
        }).success
      ).toBe(false);

      expect(
        SubmitForReviewSchema.safeParse({
          agreementId: validUuid,
          expectedDraftRevision: 0,
        }).success
      ).toBe(false);
    });
  });

  describe("RecordReviewDecisionSchema", () => {
    it("accepts APPROVE decision with valid hash", () => {
      const res = RecordReviewDecisionSchema.safeParse({
        agreementId: validUuid,
        versionId: validUuid,
        decision: "APPROVE",
        expectedVersionHash: validHash,
      });
      expect(res.success).toBe(true);
    });

    it("accepts REQUEST_CHANGES with reason", () => {
      const res = RecordReviewDecisionSchema.safeParse({
        agreementId: validUuid,
        versionId: validUuid,
        decision: "REQUEST_CHANGES",
        expectedVersionHash: validHash,
        reason: "يرجى تعديل موعد التسليم في البند الثاني",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.reason).toBe("يرجى تعديل موعد التسليم في البند الثاني");
      }
    });

    it("rejects invalid hash length or characters", () => {
      expect(
        RecordReviewDecisionSchema.safeParse({
          agreementId: validUuid,
          versionId: validUuid,
          decision: "APPROVE",
          expectedVersionHash: "short",
        }).success
      ).toBe(false);

      expect(
        RecordReviewDecisionSchema.safeParse({
          agreementId: validUuid,
          versionId: validUuid,
          decision: "APPROVE",
          expectedVersionHash: "Z".repeat(64), // uppercase not hex
        }).success
      ).toBe(false);
    });

    it("rejects invalid decision type", () => {
      expect(
        RecordReviewDecisionSchema.safeParse({
          agreementId: validUuid,
          versionId: validUuid,
          decision: "REJECT",
          expectedVersionHash: validHash,
        }).success
      ).toBe(false);
    });
  });

  describe("WithdrawReviewSchema", () => {
    it("accepts valid withdraw payload", () => {
      const res = WithdrawReviewSchema.safeParse({
        agreementId: validUuid,
        versionId: validUuid,
        reason: "سحب لإجراء تعديلات إضافية",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("ResetDraftFromVersionSchema", () => {
    it("accepts valid reset draft payload", () => {
      const res = ResetDraftFromVersionSchema.safeParse({
        agreementId: validUuid,
        versionId: validUuid,
      });
      expect(res.success).toBe(true);
    });
  });
});
