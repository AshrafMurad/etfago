import { createHash } from "crypto";

/**
 * Deterministic Canonical JSON Stringifier according to RFC 8785 principles.
 * Ensures consistent serialization:
 * - Object keys are sorted strictly by UTF-16 code units.
 * - No superfluous whitespace.
 * - Primitives conform to canonical representation.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null) {
    return "null";
  }

  const type = typeof value;

  if (type === "boolean") {
    return value ? "true" : "false";
  }

  if (type === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Cannot serialize non-finite numbers in canonical JSON");
    }
    return JSON.stringify(value);
  }

  if (type === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (item === undefined || typeof item === "symbol" || typeof item === "function") {
        return "null";
      }
      return canonicalStringify(item);
    });
    return `[${items.join(",")}]`;
  }

  if (type === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const entries: string[] = [];

    for (const key of keys) {
      const val = obj[key];
      if (val === undefined || typeof val === "symbol" || typeof val === "function") {
        continue;
      }
      entries.push(`${JSON.stringify(key)}:${canonicalStringify(val)}`);
    }

    return `{${entries.join(",")}}`;
  }

  throw new TypeError(`Unsupported type in canonical JSON: ${type}`);
}

/**
 * Computes a SHA-256 hex digest of a UTF-8 string.
 */
export function computeSha256Hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Composite structure used to compute the immutable content hash of a version snapshot
 * alongside its frozen reviewer roster.
 */
export interface VersionCanonicalComposite {
  schemaVersion: number;
  approvalPolicy?: string;
  quorumThreshold?: number | null;
  isSequential?: boolean;
  content: {
    schemaVersion: number;
    title: string;
    description: string | null;
    terms: Array<{
      id: string;
      title: string;
      body: string | null;
      amount: string | null;
      currency: string | null;
      dueDate: string | null;
      assignedParticipantId: string | null;
    }>;
  };
  reviewers: Array<{
    participantId: string;
    userId: string;
    emailSnapshot: string;
    nameSnapshot: string;
    partyKindSnapshot: string;
    roleSnapshot: string;
    required: boolean;
    stepOrder?: number;
  }>;
}

/**
 * Computes the immutable content hash (SHA-256, 64-char hex) for a version's
 * canonical composite (snapshot content + frozen reviewers roster).
 * Reviewers are automatically sorted by participantId ascending before hashing.
 */
export function computeVersionContentHash(composite: VersionCanonicalComposite): string {
  // Normalize reviewers order by participantId ascending to ensure determinism
  const sortedReviewers = [...composite.reviewers].sort((a, b) =>
    a.participantId.localeCompare(b.participantId)
  );

  const normalizedComposite: VersionCanonicalComposite = {
    schemaVersion: composite.schemaVersion,
    approvalPolicy: composite.approvalPolicy ?? "UNANIMOUS",
    quorumThreshold: composite.quorumThreshold ?? null,
    isSequential: composite.isSequential ?? false,
    content: composite.content,
    reviewers: sortedReviewers.map((r) => ({
      participantId: r.participantId,
      userId: r.userId,
      emailSnapshot: r.emailSnapshot,
      nameSnapshot: r.nameSnapshot,
      partyKindSnapshot: r.partyKindSnapshot,
      roleSnapshot: r.roleSnapshot,
      required: r.required,
      stepOrder: r.stepOrder ?? 1,
    })),
  };

  const canonicalString = canonicalStringify(normalizedComposite);
  return computeSha256Hex(canonicalString);
}
