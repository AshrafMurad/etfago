import { describe, it, expect } from "vitest";
import {
  canonicalStringify,
  computeSha256Hex,
  computeVersionContentHash,
  VersionCanonicalComposite,
} from "../../src/lib/canonical-json";

describe("Deterministic Canonical JSON & Hashing", () => {
  it("serializes objects with sorted keys regardless of insertion order", () => {
    const objA = { z: "last", a: 1, m: true };
    const objB = { a: 1, m: true, z: "last" };

    expect(canonicalStringify(objA)).toBe('{"a":1,"m":true,"z":"last"}');
    expect(canonicalStringify(objB)).toBe('{"a":1,"m":true,"z":"last"}');
    expect(canonicalStringify(objA)).toBe(canonicalStringify(objB));
  });

  it("handles nested objects with deterministic key sorting", () => {
    const nested1 = {
      user: { name: "Ahmad", id: "123" },
      active: true,
    };
    const nested2 = {
      active: true,
      user: { id: "123", name: "Ahmad" },
    };

    expect(canonicalStringify(nested1)).toBe(canonicalStringify(nested2));
    expect(computeSha256Hex(canonicalStringify(nested1))).toBe(
      computeSha256Hex(canonicalStringify(nested2))
    );
  });

  it("preserves array element ordering", () => {
    const arr1 = [1, 2, 3];
    const arr2 = [3, 2, 1];

    expect(canonicalStringify(arr1)).toBe("[1,2,3]");
    expect(canonicalStringify(arr2)).toBe("[3,2,1]");
    expect(canonicalStringify(arr1)).not.toBe(canonicalStringify(arr2));
  });

  it("handles null, strings, booleans, and numbers correctly", () => {
    expect(canonicalStringify(null)).toBe("null");
    expect(canonicalStringify("hello")).toBe('"hello"');
    expect(canonicalStringify(42)).toBe("42");
    expect(canonicalStringify(true)).toBe("true");
    expect(canonicalStringify(false)).toBe("false");
  });

  it("throws on NaN and Infinity", () => {
    expect(() => canonicalStringify(NaN)).toThrow(TypeError);
    expect(() => canonicalStringify(Infinity)).toThrow(TypeError);
  });

  it("computes 64-character SHA-256 hex digest for version canonical composite", () => {
    const composite: VersionCanonicalComposite = {
      schemaVersion: 1,
      content: {
        schemaVersion: 1,
        title: "اتفاق خدمات استشارية",
        description: "وصف الاتفاق",
        terms: [
          {
            id: "term_1",
            title: "نطاق العمل",
            body: "تقديم الاستشارات البرمجية",
            amount: null,
            currency: null,
            dueDate: "2026-12-01",
            assignedParticipantId: null,
          },
        ],
      },
      reviewers: [
        {
          participantId: "part_2",
          userId: "user_2",
          emailSnapshot: "client@example.com",
          nameSnapshot: "Client Partner",
          partyKindSnapshot: "PERSON",
          roleSnapshot: "REVIEWER",
          required: true,
        },
        {
          participantId: "part_1",
          userId: "user_1",
          emailSnapshot: "consultant@example.com",
          nameSnapshot: "Consultant Lead",
          partyKindSnapshot: "PERSON",
          roleSnapshot: "ORGANIZER",
          required: true,
        },
      ],
    };

    const hash1 = computeVersionContentHash(composite);
    expect(hash1).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);

    // Permuting reviewers array in input should still yield identical hash because it sorts by participantId
    const permutedReviewersComposite: VersionCanonicalComposite = {
      ...composite,
      reviewers: [composite.reviewers[1], composite.reviewers[0]],
    };
    const hash2 = computeVersionContentHash(permutedReviewersComposite);
    expect(hash1).toBe(hash2);

    // Altering any term changes the hash
    const alteredTermComposite: VersionCanonicalComposite = {
      ...composite,
      content: {
        ...composite.content,
        terms: [
          {
            ...composite.content.terms[0],
            body: "تقديم الاستشارات البرمجية والتقنية المتقدمة",
          },
        ],
      },
    };
    expect(computeVersionContentHash(alteredTermComposite)).not.toBe(hash1);

    // Altering reviewer required status changes the hash
    const alteredReviewerComposite: VersionCanonicalComposite = {
      ...composite,
      reviewers: [
        { ...composite.reviewers[0], required: false },
        composite.reviewers[1],
      ],
    };
    expect(computeVersionContentHash(alteredReviewerComposite)).not.toBe(hash1);
  });
});
