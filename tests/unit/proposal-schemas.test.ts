import { describe, it, expect } from "vitest";
import {
  CreateChangeRequestSchema,
  ResolveChangeRequestSchema,
  CancelChangeRequestSchema,
} from "../../src/lib/schemas/proposals";

describe("Sprint 5 Unit: Change Proposal Schemas", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";
  const validVersionUuid = "22222222-2222-4222-8222-222222222222";

  it("validates valid UPDATE proposal", () => {
    const input = {
      agreementId: validUuid,
      baseVersionId: validVersionUuid,
      termId: "term_1",
      operation: "UPDATE",
      oldTermJson: {
        id: "term_1",
        title: "Old Scope",
        body: "Old details",
      },
      newTermJson: {
        id: "term_1",
        title: "New Scope",
        body: "Updated details with better scope",
        amount: "5000",
        currency: "SAR",
      },
      reason: "Updating scope per discussion",
    };

    const parsed = CreateChangeRequestSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("rejects UPDATE proposal without newTermJson", () => {
    const input = {
      agreementId: validUuid,
      termId: "term_1",
      operation: "UPDATE",
      oldTermJson: { id: "term_1", title: "Old Title" },
    };

    const parsed = CreateChangeRequestSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it("validates valid ADD proposal", () => {
    const input = {
      agreementId: validUuid,
      termId: "term_new",
      operation: "ADD",
      newTermJson: {
        id: "term_new",
        title: "New Penalty Clause",
        body: "Delayed delivery incurs 1% per week",
      },
      reason: "Need penalty terms",
    };

    const parsed = CreateChangeRequestSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("rejects ADD proposal without newTermJson", () => {
    const input = {
      agreementId: validUuid,
      termId: "term_new",
      operation: "ADD",
    };

    const parsed = CreateChangeRequestSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it("validates valid REMOVE proposal", () => {
    const input = {
      agreementId: validUuid,
      termId: "term_delete",
      operation: "REMOVE",
      oldTermJson: {
        id: "term_delete",
        title: "Obsolete Clause",
      },
      reason: "Clause is no longer applicable",
    };

    const parsed = CreateChangeRequestSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("validates ResolveChangeRequestSchema for ACCEPT and DECLINE", () => {
    const acceptInput = {
      agreementId: validUuid,
      changeRequestId: validUuid,
      action: "ACCEPT",
    };
    expect(ResolveChangeRequestSchema.safeParse(acceptInput).success).toBe(true);

    const declineInput = {
      agreementId: validUuid,
      changeRequestId: validUuid,
      action: "DECLINE",
      declineReason: "Terms do not align with commercial model",
    };
    expect(ResolveChangeRequestSchema.safeParse(declineInput).success).toBe(true);
  });

  it("validates CancelChangeRequestSchema", () => {
    const cancelInput = {
      agreementId: validUuid,
      changeRequestId: validUuid,
    };
    expect(CancelChangeRequestSchema.safeParse(cancelInput).success).toBe(true);
  });
});
