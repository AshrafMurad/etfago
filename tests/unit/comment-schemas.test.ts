import { describe, it, expect } from "vitest";
import {
  CreateCommentSchema,
  UpdateCommentSchema,
  DeleteCommentSchema,
} from "../../src/lib/schemas/comments";

describe("Sprint 5 Unit: Comment Schemas", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";

  it("validates valid comment on agreement", () => {
    const input = {
      agreementId: validUuid,
      body: "Looking forward to working together on this!",
    };
    const parsed = CreateCommentSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("validates comment linked to version and term", () => {
    const input = {
      agreementId: validUuid,
      versionId: validUuid,
      termId: "term_delivery",
      body: "Could we clarify the delivery milestone?",
    };
    const parsed = CreateCommentSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.termId).toBe("term_delivery");
    }
  });

  it("rejects empty comment", () => {
    const input = {
      agreementId: validUuid,
      body: "   ",
    };
    const parsed = CreateCommentSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it("rejects comment exceeding 2000 chars", () => {
    const input = {
      agreementId: validUuid,
      body: "a".repeat(2001),
    };
    const parsed = CreateCommentSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it("validates UpdateCommentSchema and DeleteCommentSchema", () => {
    const updateInput = {
      agreementId: validUuid,
      commentId: validUuid,
      body: "Updated comment text",
    };
    expect(UpdateCommentSchema.safeParse(updateInput).success).toBe(true);

    const deleteInput = {
      agreementId: validUuid,
      commentId: validUuid,
    };
    expect(DeleteCommentSchema.safeParse(deleteInput).success).toBe(true);
  });
});
