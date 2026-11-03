import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canViewAgreement,
  canEditDraft,
  canInvite,
  canReview,
} from "../../src/server/auth/permissions";
import { db } from "../../src/server/db/prisma";

// Mock the Prisma db client for unit tests
vi.mock("../../src/server/db/prisma", () => ({
  db: {
    agreement: {
      findUnique: vi.fn(),
    },
    agreementParticipant: {
      findFirst: vi.fn(),
    },
    versionReviewer: {
      findFirst: vi.fn(),
    },
  },
}));

describe("Agreement permission skeleton & deny-by-default checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canViewAgreement", () => {
    it("returns true if actor is the agreement organizer", async () => {
      vi.mocked(db.agreement.findUnique).mockResolvedValueOnce({
        id: "agr-1",
        organizerUserId: "user-organizer",
        archivedAt: null,
        participants: [],
      } as any);

      const result = await canViewAgreement("user-organizer", "agr-1");
      expect(result).toBe(true);
    });

    it("returns true if actor is an active linked participant", async () => {
      vi.mocked(db.agreement.findUnique).mockResolvedValueOnce({
        id: "agr-1",
        organizerUserId: "user-organizer",
        archivedAt: null,
        participants: [{ id: "part-1" }],
      } as any);

      const result = await canViewAgreement("user-participant", "agr-1");
      expect(result).toBe(true);
    });

    it("returns false (DENY) for an outsider or unrelated workspace member", async () => {
      vi.mocked(db.agreement.findUnique).mockResolvedValueOnce({
        id: "agr-1",
        organizerUserId: "user-organizer",
        archivedAt: null,
        participants: [], // No active participant record matching this actor
      } as any);

      const result = await canViewAgreement("user-outsider", "agr-1");
      expect(result).toBe(false);
    });

    it("returns false if agreement is not found", async () => {
      vi.mocked(db.agreement.findUnique).mockResolvedValueOnce(null);

      const result = await canViewAgreement("user-1", "non-existent");
      expect(result).toBe(false);
    });

    it("returns false if actorId or agreementId is empty", async () => {
      expect(await canViewAgreement("", "agr-1")).toBe(false);
      expect(await canViewAgreement("user-1", "")).toBe(false);
    });
  });

  describe("canEditDraft", () => {
    it("allows organizer to edit draft", async () => {
      vi.mocked(db.agreement.findUnique).mockResolvedValueOnce({
        id: "agr-1",
        organizerUserId: "user-organizer",
        lifecycleStatus: "DRAFT",
        participants: [],
      } as any);

      const result = await canEditDraft("user-organizer", "agr-1");
      expect(result).toBe(true);
    });

    it("allows participant with EDITOR role to edit draft", async () => {
      vi.mocked(db.agreement.findUnique).mockResolvedValueOnce({
        id: "agr-1",
        organizerUserId: "user-organizer",
        lifecycleStatus: "DRAFT",
        participants: [
          { id: "part-1", agreementRole: "EDITOR" },
        ],
      } as any);

      const result = await canEditDraft("user-editor", "agr-1");
      expect(result).toBe(true);
    });

    it("denies REVIEWER from editing draft", async () => {
      vi.mocked(db.agreement.findUnique).mockResolvedValueOnce({
        id: "agr-1",
        organizerUserId: "user-organizer",
        lifecycleStatus: "DRAFT",
        participants: [
          { id: "part-1", agreementRole: "REVIEWER" },
        ],
      } as any);

      const result = await canEditDraft("user-reviewer", "agr-1");
      expect(result).toBe(false);
    });

    it("denies OBSERVER from editing draft", async () => {
      vi.mocked(db.agreement.findUnique).mockResolvedValueOnce({
        id: "agr-1",
        organizerUserId: "user-organizer",
        lifecycleStatus: "DRAFT",
        participants: [
          { id: "part-1", agreementRole: "OBSERVER" },
        ],
      } as any);

      const result = await canEditDraft("user-observer", "agr-1");
      expect(result).toBe(false);
    });
  });

  describe("canInvite", () => {
    it("allows organizer to invite participants", async () => {
      vi.mocked(db.agreement.findUnique).mockResolvedValueOnce({
        id: "agr-1",
        organizerUserId: "user-organizer",
      } as any);

      const result = await canInvite("user-organizer", "agr-1");
      expect(result).toBe(true);
    });

    it("denies non-organizer from inviting participants", async () => {
      vi.mocked(db.agreement.findUnique).mockResolvedValueOnce({
        id: "agr-1",
        organizerUserId: "user-organizer",
      } as any);

      const result = await canInvite("user-editor", "agr-1");
      expect(result).toBe(false);
    });
  });

  describe("canReview", () => {
    it("allows review if actor is marked as required reviewer in version roster", async () => {
      vi.mocked(db.versionReviewer.findFirst).mockResolvedValueOnce({
        id: "vr-1",
        versionId: "ver-1",
        userId: "user-reviewer",
        required: true,
      } as any);

      const result = await canReview("user-reviewer", "agr-1", "ver-1");
      expect(result).toBe(true);
    });

    it("denies review if actor is not a required reviewer in version roster", async () => {
      vi.mocked(db.versionReviewer.findFirst).mockResolvedValueOnce(null);

      const result = await canReview("user-reviewer", "agr-1", "ver-1");
      expect(result).toBe(false);
    });

    it("checks active participant roster when versionId is not supplied", async () => {
      vi.mocked(db.agreementParticipant.findFirst).mockResolvedValueOnce({
        id: "part-1",
        requiredByDefault: true,
        agreementRole: "REVIEWER",
      } as any);

      const result = await canReview("user-reviewer", "agr-1");
      expect(result).toBe(true);
    });
  });
});
