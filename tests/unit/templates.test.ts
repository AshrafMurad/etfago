import { describe, it, expect } from "vitest";
import {
  STARTER_TEMPLATES,
  getStarterTemplates,
  getStarterTemplateById,
  instantiateTemplateTerms,
} from "../../src/lib/templates/registry";
import { DraftContentSchema } from "../../src/lib/schemas/agreements";
import { StarterTemplateDefinitionSchema } from "../../src/lib/schemas/templates";

describe("Sprint 8 Unit: Starter Templates by Agreement Purpose (F-21)", () => {
  it("provides all four required core starter templates", () => {
    const ids = STARTER_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("personal-shared-responsibility");
    expect(ids).toContain("freelance-professional-services");
    expect(ids).toContain("goods-supply-procurement");
    expect(ids).toContain("mutual-confidentiality-nda");
    expect(STARTER_TEMPLATES.length).toBeGreaterThanOrEqual(4);
  });

  it("validates every starter template against StarterTemplateDefinitionSchema", () => {
    for (const template of STARTER_TEMPLATES) {
      const parsed = StarterTemplateDefinitionSchema.safeParse(template);
      expect(parsed.success).toBe(true);

      // Title constraints
      expect(template.title.ar.length).toBeGreaterThanOrEqual(3);
      expect(template.title.ar.length).toBeLessThanOrEqual(160);
      expect(template.title.en.length).toBeGreaterThanOrEqual(3);
      expect(template.title.en.length).toBeLessThanOrEqual(160);

      // Description constraints
      expect(template.description.ar.length).toBeGreaterThanOrEqual(10);
      expect(template.description.ar.length).toBeLessThanOrEqual(4000);
      expect(template.description.en.length).toBeGreaterThanOrEqual(10);
      expect(template.description.en.length).toBeLessThanOrEqual(4000);

      // Suggested roles parity
      expect(template.suggestedRoles.ar.length).toBeGreaterThanOrEqual(2);
      expect(template.suggestedRoles.en.length).toBeGreaterThanOrEqual(2);

      // Term constraints
      expect(template.terms.length).toBeGreaterThanOrEqual(1);
      expect(template.terms.length).toBeLessThanOrEqual(50);

      for (const term of template.terms) {
        expect(term.title.ar.length).toBeGreaterThanOrEqual(2);
        expect(term.title.ar.length).toBeLessThanOrEqual(120);
        expect(term.title.en.length).toBeGreaterThanOrEqual(2);
        expect(term.title.en.length).toBeLessThanOrEqual(120);

        expect(term.body.ar.length).toBeGreaterThanOrEqual(10);
        expect(term.body.ar.length).toBeLessThanOrEqual(4000);
        expect(term.body.en.length).toBeGreaterThanOrEqual(10);
        expect(term.body.en.length).toBeLessThanOrEqual(4000);
      }
    }
  });

  it("returns Arabic localized templates by default or when requested", () => {
    const templatesAr = getStarterTemplates("ar");
    expect(templatesAr.length).toBe(STARTER_TEMPLATES.length);

    const first = templatesAr[0];
    expect(first.title).toBe(STARTER_TEMPLATES[0].title.ar);
    expect(first.description).toBe(STARTER_TEMPLATES[0].description.ar);
    expect(first.suggestedRoles).toEqual(STARTER_TEMPLATES[0].suggestedRoles.ar);
    expect(first.terms[0].title).toBe(STARTER_TEMPLATES[0].terms[0].title.ar);
  });

  it("returns English localized templates when requested", () => {
    const templatesEn = getStarterTemplates("en");
    expect(templatesEn.length).toBe(STARTER_TEMPLATES.length);

    const first = templatesEn[0];
    expect(first.title).toBe(STARTER_TEMPLATES[0].title.en);
    expect(first.description).toBe(STARTER_TEMPLATES[0].description.en);
    expect(first.suggestedRoles).toEqual(STARTER_TEMPLATES[0].suggestedRoles.en);
    expect(first.terms[0].title).toBe(STARTER_TEMPLATES[0].terms[0].title.en);
  });

  it("filters templates by category properly", () => {
    const servicesTemplates = getStarterTemplates("ar", "SERVICES");
    expect(servicesTemplates.length).toBeGreaterThanOrEqual(1);
    expect(servicesTemplates.every((t) => t.category === "SERVICES")).toBe(true);

    const personalTemplates = getStarterTemplates("en", "PERSONAL");
    expect(personalTemplates.length).toBeGreaterThanOrEqual(1);
    expect(personalTemplates.every((t) => t.category === "PERSONAL")).toBe(true);

    const allTemplates = getStarterTemplates("ar", "ALL");
    expect(allTemplates.length).toBe(STARTER_TEMPLATES.length);
  });

  it("retrieves a single template by ID or returns null if unknown", () => {
    const found = getStarterTemplateById("freelance-professional-services", "ar");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("freelance-professional-services");
    expect(found?.terms.length).toBe(5);

    const missing = getStarterTemplateById("non-existent-template", "ar");
    expect(missing).toBeNull();
  });

  it("instantiates template terms with unique IDs and valid DraftContentSchema conformance", () => {
    const instantiated1 = instantiateTemplateTerms("freelance-professional-services", "ar");
    const instantiated2 = instantiateTemplateTerms("freelance-professional-services", "ar");

    // Title and description match Arabic definition
    expect(instantiated1.title).toContain("خدمات مهنية");
    expect(instantiated1.terms.length).toBe(5);

    // Conforms strictly to canonical DraftContentSchema
    const draftPayload = {
      schemaVersion: 1 as const,
      title: instantiated1.title,
      description: instantiated1.description,
      terms: instantiated1.terms,
    };
    const parsedDraft = DraftContentSchema.safeParse(draftPayload);
    expect(parsedDraft.success).toBe(true);

    // Terms IDs must be unique within an instantiation
    const ids1 = instantiated1.terms.map((t) => t.id);
    const uniqueIds1 = new Set(ids1);
    expect(uniqueIds1.size).toBe(ids1.length);

    // Term IDs across distinct instantiations must never collide
    const ids2 = instantiated2.terms.map((t) => t.id);
    for (const id of ids1) {
      expect(ids2).not.toContain(id);
    }
  });

  it("throws a descriptive error when attempting to instantiate an unknown template", () => {
    expect(() => instantiateTemplateTerms("unknown-invalid-id", "ar")).toThrow(
      "Starter template 'unknown-invalid-id' not found"
    );
  });
});
