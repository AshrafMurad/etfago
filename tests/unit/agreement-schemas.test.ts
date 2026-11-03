import { describe, it, expect } from "vitest";
import {
  TermSchema,
  DraftContentSchema,
  CreateAgreementSchema,
  UpdateDraftSchema,
} from "../../src/lib/schemas/agreements";

describe("Agreement and Draft Schemas (Sprint 2)", () => {
  describe("TermSchema", () => {
    it("validates a structured term with minimal required fields (no money, no deadline)", () => {
      const parsed = TermSchema.parse({
        id: "term_1",
        title: "تسليم المتطلبات الأساسية",
      });

      expect(parsed.id).toBe("term_1");
      expect(parsed.title).toBe("تسليم المتطلبات الأساسية");
      expect(parsed.body).toBeNull();
      expect(parsed.amount).toBeNull();
      expect(parsed.currency).toBeNull();
      expect(parsed.dueDate).toBeNull();
      expect(parsed.assignedParticipantId).toBeNull();
    });

    it("validates optional amount, currency, and valid YYYY-MM-DD dueDate", () => {
      const parsed = TermSchema.parse({
        id: "term_2",
        title: "الدفعة الأولى",
        body: "مقدم العقد عند البدء",
        amount: "5000",
        currency: "sar",
        dueDate: "2026-11-20",
      });

      expect(parsed.amount).toBe("5000");
      expect(parsed.currency).toBe("SAR");
      expect(parsed.dueDate).toBe("2026-11-20");
    });

    it("rejects invalid date format", () => {
      const result = TermSchema.safeParse({
        id: "term_3",
        title: "موعد غير صالح",
        dueDate: "20-11-2026",
      });

      expect(result.success).toBe(false);
    });

    it("enforces title length limits (max 120 chars)", () => {
      const longTitle = "أ".repeat(121);
      const result = TermSchema.safeParse({
        id: "term_4",
        title: longTitle,
      });

      expect(result.success).toBe(false);
    });

    it("enforces body length limits (max 4000 chars)", () => {
      const longBody = "ب".repeat(4001);
      const result = TermSchema.safeParse({
        id: "term_5",
        title: "بند طويل",
        body: longBody,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("DraftContentSchema", () => {
    it("validates draft content with schemaVersion 1", () => {
      const parsed = DraftContentSchema.parse({
        title: "اتفاق خدمات استشارية",
        description: "شروط التعاقد والتسليم",
        terms: [
          {
            id: "term_1",
            title: "نطاق العمل",
            body: "تقديم استشارات تقنية",
          },
        ],
      });

      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.title).toBe("اتفاق خدمات استشارية");
      expect(parsed.terms.length).toBe(1);
    });

    it("enforces max 50 terms bound", () => {
      const fiftyOneTerms = Array.from({ length: 51 }, (_, i) => ({
        id: `term_${i + 1}`,
        title: `بند ${i + 1}`,
      }));

      const result = DraftContentSchema.safeParse({
        title: "اتفاق ببنود كثيرة",
        terms: fiftyOneTerms,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("CreateAgreementSchema", () => {
    it("requires a valid workspaceId UUID and title min 2 chars", () => {
      const result = CreateAgreementSchema.safeParse({
        workspaceId: "not-a-uuid",
        title: "أ",
      });

      expect(result.success).toBe(false);
    });

    it("accepts valid agreement creation input", () => {
      const parsed = CreateAgreementSchema.parse({
        workspaceId: "11111111-1111-1111-1111-111111111111",
        title: "مشروع تطوير منصة",
        category: "DEVELOPMENT",
      });

      expect(parsed.title).toBe("مشروع تطوير منصة");
      expect(parsed.category).toBe("DEVELOPMENT");
      expect(parsed.initialTerms).toEqual([]);
    });
  });

  describe("UpdateDraftSchema", () => {
    it("requires expectedRevision >= 1 for optimistic lock", () => {
      const valid = UpdateDraftSchema.safeParse({
        agreementId: "11111111-1111-1111-1111-111111111111",
        expectedRevision: 1,
        content: {
          schemaVersion: 1,
          title: "عنوان محدث",
          terms: [],
        },
      });

      expect(valid.success).toBe(true);

      const invalid = UpdateDraftSchema.safeParse({
        agreementId: "11111111-1111-1111-1111-111111111111",
        expectedRevision: 0,
        content: {
          schemaVersion: 1,
          title: "عنوان محدث",
          terms: [],
        },
      });

      expect(invalid.success).toBe(false);
    });
  });
});
