import { describe, it, expect } from "vitest";
import { diffTerms } from "../../src/lib/diff";
import { StructuredTerm } from "../../src/lib/schemas/agreements";

describe("Sprint 5 Unit: Version Diffing Engine", () => {
  const term1: StructuredTerm = {
    id: "term_1",
    title: "Scope of Service",
    body: "Initial scope",
    amount: "1000",
    currency: "SAR",
    dueDate: "2026-12-01",
    assignedParticipantId: null,
  };

  const term2: StructuredTerm = {
    id: "term_2",
    title: "Payment Terms",
    body: "50% upfront, 50% on completion",
    amount: "2000",
    currency: "SAR",
    dueDate: null,
    assignedParticipantId: null,
  };

  it("identifies no differences when term sets are identical", () => {
    const diff = diffTerms([term1, term2], [term1, term2]);
    expect(diff.hasDifferences).toBe(false);
    expect(diff.addedCount).toBe(0);
    expect(diff.removedCount).toBe(0);
    expect(diff.modifiedCount).toBe(0);
    expect(diff.unchangedCount).toBe(2);
  });

  it("identifies added terms", () => {
    const newTerm: StructuredTerm = {
      id: "term_3",
      title: "Confidentiality",
      body: "Parties shall keep all records confidential",
      amount: null,
      currency: null,
      dueDate: null,
      assignedParticipantId: null,
    };

    const diff = diffTerms([term1], [term1, newTerm]);
    expect(diff.hasDifferences).toBe(true);
    expect(diff.addedCount).toBe(1);
    expect(diff.unchangedCount).toBe(1);

    const added = diff.terms.find((t) => t.termId === "term_3");
    expect(added?.status).toBe("ADDED");
    expect(added?.newTerm?.title).toBe("Confidentiality");
  });

  it("identifies removed terms", () => {
    const diff = diffTerms([term1, term2], [term1]);
    expect(diff.hasDifferences).toBe(true);
    expect(diff.removedCount).toBe(1);
    expect(diff.unchangedCount).toBe(1);

    const removed = diff.terms.find((t) => t.termId === "term_2");
    expect(removed?.status).toBe("REMOVED");
    expect(removed?.oldTerm?.title).toBe("Payment Terms");
  });

  it("identifies field-level modifications (title, body, amount, dueDate)", () => {
    const modifiedTerm1: StructuredTerm = {
      ...term1,
      title: "Expanded Scope of Service",
      amount: "1500",
      dueDate: "2026-12-15",
    };

    const diff = diffTerms([term1], [modifiedTerm1]);
    expect(diff.hasDifferences).toBe(true);
    expect(diff.modifiedCount).toBe(1);
    expect(diff.unchangedCount).toBe(0);

    const mod = diff.terms[0];
    expect(mod.status).toBe("MODIFIED");
    expect(mod.fieldChanges.length).toBe(3);

    const titleChange = mod.fieldChanges.find((f) => f.field === "title");
    expect(titleChange?.oldValue).toBe("Scope of Service");
    expect(titleChange?.newValue).toBe("Expanded Scope of Service");

    const amountChange = mod.fieldChanges.find((f) => f.field === "amount");
    expect(amountChange?.oldValue).toBe("1000");
    expect(amountChange?.newValue).toBe("1500");

    const dateChange = mod.fieldChanges.find((f) => f.field === "dueDate");
    expect(dateChange?.oldValue).toBe("2026-12-01");
    expect(dateChange?.newValue).toBe("2026-12-15");
  });

  it("handles complex mixed diff: 1 added, 1 removed, 1 modified, 1 unchanged", () => {
    const term3: StructuredTerm = {
      id: "term_3",
      title: "Warranty",
      body: "12 months warranty",
      amount: null,
      currency: null,
      dueDate: null,
      assignedParticipantId: null,
    };

    const term4: StructuredTerm = {
      id: "term_4",
      title: "Termination",
      body: "30 days notice",
      amount: null,
      currency: null,
      dueDate: null,
      assignedParticipantId: null,
    };

    const base = [term1, term2, term3];

    const modifiedTerm1: StructuredTerm = {
      ...term1,
      body: "Updated scope with milestones",
    };

    const compare = [
      modifiedTerm1, // modified
      term2, // unchanged
      term4, // added
      // term3 removed
    ];

    const diff = diffTerms(base, compare);
    expect(diff.hasDifferences).toBe(true);
    expect(diff.addedCount).toBe(1);
    expect(diff.removedCount).toBe(1);
    expect(diff.modifiedCount).toBe(1);
    expect(diff.unchangedCount).toBe(1);
    expect(diff.terms.length).toBe(4);
  });
});
