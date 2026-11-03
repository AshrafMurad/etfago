import { describe, it, expect } from "vitest";
import {
  InviteParticipantSchema,
  RedeemInvitationSchema,
  UpdateParticipantRoleSchema,
} from "../../src/lib/schemas/invitations";

describe("Invitation Schemas (Sprint 3)", () => {
  it("normalizes recipient email address", () => {
    const parsed = InviteParticipantSchema.parse({
      agreementId: "11111111-1111-1111-1111-111111111111",
      email: "  Alice.Partner+Work@Example.COM  ",
      partyDisplayName: "أليس الشريكة",
      agreementRole: "REVIEWER",
      partyKind: "PERSON",
    });

    expect(parsed.email).toBe("alice.partner+work@example.com");
    expect(parsed.partyDisplayName).toBe("أليس الشريكة");
    expect(parsed.requiredByDefault).toBe(true);
  });

  it("rejects invalid email address", () => {
    const result = InviteParticipantSchema.safeParse({
      agreementId: "11111111-1111-1111-1111-111111111111",
      email: "not-an-email",
      partyDisplayName: "سالم",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty party display name", () => {
    const result = InviteParticipantSchema.safeParse({
      agreementId: "11111111-1111-1111-1111-111111111111",
      email: "salem@example.com",
      partyDisplayName: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("validates redeem invitation token format", () => {
    const shortToken = RedeemInvitationSchema.safeParse({ token: "12345" });
    expect(shortToken.success).toBe(false);

    const validToken = RedeemInvitationSchema.safeParse({
      token: "a".repeat(64),
    });
    expect(validToken.success).toBe(true);
  });

  it("validates participant role update", () => {
    const parsed = UpdateParticipantRoleSchema.parse({
      agreementId: "11111111-1111-1111-1111-111111111111",
      participantId: "22222222-2222-2222-2222-222222222222",
      agreementRole: "EDITOR",
      requiredByDefault: false,
    });

    expect(parsed.agreementRole).toBe("EDITOR");
    expect(parsed.requiredByDefault).toBe(false);
  });
});
