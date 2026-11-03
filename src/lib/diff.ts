import { StructuredTerm } from "./schemas/agreements";

export type DiffChangeStatus = "ADDED" | "REMOVED" | "MODIFIED" | "UNCHANGED";

export interface TermFieldChange {
  field: "title" | "body" | "amount" | "currency" | "dueDate" | "assignedParticipantId";
  oldValue: string | null;
  newValue: string | null;
}

export interface TermDiff {
  termId: string;
  status: DiffChangeStatus;
  oldTerm: StructuredTerm | null;
  newTerm: StructuredTerm | null;
  fieldChanges: TermFieldChange[];
}

export interface VersionDiffResult {
  terms: TermDiff[];
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
  hasDifferences: boolean;
}

/**
 * Compares two arrays of StructuredTerms (e.g. base version vs newer version/draft)
 * and produces a detailed, deterministic diff.
 */
export function diffTerms(
  baseTerms: StructuredTerm[],
  compareTerms: StructuredTerm[]
): VersionDiffResult {
  const baseMap = new Map<string, StructuredTerm>();
  for (const term of baseTerms) {
    baseMap.set(term.id, term);
  }

  const compareMap = new Map<string, StructuredTerm>();
  for (const term of compareTerms) {
    compareMap.set(term.id, term);
  }

  const resultTerms: TermDiff[] = [];
  const processedCompareIds = new Set<string>();

  // 1. Process all terms in compareTerms (preserves order of newer version)
  for (const newTerm of compareTerms) {
    processedCompareIds.add(newTerm.id);
    const oldTerm = baseMap.get(newTerm.id);

    if (!oldTerm) {
      // Term added in compare version
      resultTerms.push({
        termId: newTerm.id,
        status: "ADDED",
        oldTerm: null,
        newTerm,
        fieldChanges: [],
      });
      continue;
    }

    // Term exists in both — detect field-level changes
    const fieldChanges: TermFieldChange[] = [];

    if (oldTerm.title.trim() !== newTerm.title.trim()) {
      fieldChanges.push({
        field: "title",
        oldValue: oldTerm.title,
        newValue: newTerm.title,
      });
    }

    const oldBody = oldTerm.body?.trim() || null;
    const newBody = newTerm.body?.trim() || null;
    if (oldBody !== newBody) {
      fieldChanges.push({
        field: "body",
        oldValue: oldTerm.body ?? null,
        newValue: newTerm.body ?? null,
      });
    }

    if ((oldTerm.amount ?? null) !== (newTerm.amount ?? null)) {
      fieldChanges.push({
        field: "amount",
        oldValue: oldTerm.amount ?? null,
        newValue: newTerm.amount ?? null,
      });
    }

    if ((oldTerm.currency ?? null) !== (newTerm.currency ?? null)) {
      fieldChanges.push({
        field: "currency",
        oldValue: oldTerm.currency ?? null,
        newValue: newTerm.currency ?? null,
      });
    }

    if ((oldTerm.dueDate ?? null) !== (newTerm.dueDate ?? null)) {
      fieldChanges.push({
        field: "dueDate",
        oldValue: oldTerm.dueDate ?? null,
        newValue: newTerm.dueDate ?? null,
      });
    }

    if (
      (oldTerm.assignedParticipantId ?? null) !==
      (newTerm.assignedParticipantId ?? null)
    ) {
      fieldChanges.push({
        field: "assignedParticipantId",
        oldValue: oldTerm.assignedParticipantId ?? null,
        newValue: newTerm.assignedParticipantId ?? null,
      });
    }

    if (fieldChanges.length > 0) {
      resultTerms.push({
        termId: newTerm.id,
        status: "MODIFIED",
        oldTerm,
        newTerm,
        fieldChanges,
      });
    } else {
      resultTerms.push({
        termId: newTerm.id,
        status: "UNCHANGED",
        oldTerm,
        newTerm,
        fieldChanges: [],
      });
    }
  }

  // 2. Process terms in baseMap that were removed in compareTerms
  for (const oldTerm of baseTerms) {
    if (!processedCompareIds.has(oldTerm.id)) {
      resultTerms.push({
        termId: oldTerm.id,
        status: "REMOVED",
        oldTerm,
        newTerm: null,
        fieldChanges: [],
      });
    }
  }

  const addedCount = resultTerms.filter((t) => t.status === "ADDED").length;
  const removedCount = resultTerms.filter((t) => t.status === "REMOVED").length;
  const modifiedCount = resultTerms.filter((t) => t.status === "MODIFIED").length;
  const unchangedCount = resultTerms.filter((t) => t.status === "UNCHANGED").length;

  return {
    terms: resultTerms,
    addedCount,
    removedCount,
    modifiedCount,
    unchangedCount,
    hasDifferences: addedCount > 0 || removedCount > 0 || modifiedCount > 0,
  };
}
