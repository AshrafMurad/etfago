import { describe, it, expect } from "vitest";
import {
  CreateCommitmentSchema,
  UpdateCommitmentStatusSchema,
  UpdateCommitmentSchema,
  DeleteCommitmentSchema,
} from "../../src/lib/schemas/commitments";

describe("Sprint 6 Unit: Commitment Schemas", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";

  describe("CreateCommitmentSchema", () => {
    it("validates valid commitment with minimal fields", () => {
      const input = {
        agreementId: validUuid,
        title: "Deliver architectural design",
      };
      const parsed = CreateCommitmentSchema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.title).toBe("Deliver architectural design");
        expect(parsed.data.agreementId).toBe(validUuid);
      }
    });

    it("validates commitment with full optional fields", () => {
      const input = {
        agreementId: validUuid,
        sourceVersionId: validUuid,
        sourceTermId: "term_delivery_1",
        title: "Deliver schematics",
        details: "Include structural, electrical, and HVAC layers in CAD.",
        assigneeParticipantId: validUuid,
        dueAt: "2026-12-31T23:59:59Z",
      };
      const parsed = CreateCommitmentSchema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.sourceTermId).toBe("term_delivery_1");
        expect(parsed.data.assigneeParticipantId).toBe(validUuid);
      }
    });

    it("rejects empty title", () => {
      const input = {
        agreementId: validUuid,
        title: "   ",
      };
      const parsed = CreateCommitmentSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });

    it("rejects title exceeding 160 characters", () => {
      const input = {
        agreementId: validUuid,
        title: "A".repeat(161),
      };
      const parsed = CreateCommitmentSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });

    it("rejects invalid agreementId UUID", () => {
      const input = {
        agreementId: "not-a-uuid",
        title: "Valid Title",
      };
      const parsed = CreateCommitmentSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });

    it("rejects details exceeding 4000 characters", () => {
      const input = {
        agreementId: validUuid,
        title: "Valid Title",
        details: "D".repeat(4001),
      };
      const parsed = CreateCommitmentSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });
  });

  describe("UpdateCommitmentStatusSchema", () => {
    it("validates valid status update to IN_PROGRESS", () => {
      const input = {
        agreementId: validUuid,
        commitmentId: validUuid,
        status: "IN_PROGRESS",
        expectedRevision: 1,
      };
      const parsed = UpdateCommitmentStatusSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });

    it("validates status transitions to DONE or CANCELLED", () => {
      for (const status of ["DONE", "CANCELLED", "TODO"]) {
        const parsed = UpdateCommitmentStatusSchema.safeParse({
          agreementId: validUuid,
          commitmentId: validUuid,
          status,
          expectedRevision: 2,
        });
        expect(parsed.success).toBe(true);
      }
    });

    it("rejects invalid status", () => {
      const parsed = UpdateCommitmentStatusSchema.safeParse({
        agreementId: validUuid,
        commitmentId: validUuid,
        status: "INVALID_STATUS",
        expectedRevision: 1,
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects non-positive revision", () => {
      const parsed = UpdateCommitmentStatusSchema.safeParse({
        agreementId: validUuid,
        commitmentId: validUuid,
        status: "DONE",
        expectedRevision: 0,
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("UpdateCommitmentSchema and DeleteCommitmentSchema", () => {
    it("validates update commitment details", () => {
      const input = {
        agreementId: validUuid,
        commitmentId: validUuid,
        title: "Updated Title",
        details: "New details",
        expectedRevision: 1,
      };
      const parsed = UpdateCommitmentSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });

    it("validates delete commitment input", () => {
      const input = {
        agreementId: validUuid,
        commitmentId: validUuid,
      };
      const parsed = DeleteCommitmentSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });
  });
});
