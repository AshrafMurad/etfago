import { describe, it, expect } from "vitest";
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  TransferWorkspaceOwnershipSchema,
  ArchiveWorkspaceSchema,
  WorkspaceReportQuerySchema,
} from "../../src/lib/schemas/workspaces";

describe("Workspace Admin & Reporting Schemas Unit Tests", () => {
  describe("UpdateWorkspaceSchema", () => {
    it("accepts valid workspace names and trims whitespace", () => {
      const parsed = UpdateWorkspaceSchema.safeParse({ name: "  Al-Manara Trading Co  " });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe("Al-Manara Trading Co");
      }
    });

    it("rejects names that are too short or too long", () => {
      expect(UpdateWorkspaceSchema.safeParse({ name: " " }).success).toBe(false);
      expect(UpdateWorkspaceSchema.safeParse({ name: "a" }).success).toBe(false);
      expect(UpdateWorkspaceSchema.safeParse({ name: "a".repeat(101) }).success).toBe(false);
    });
  });

  describe("TransferWorkspaceOwnershipSchema", () => {
    it("accepts a valid target user UUID", () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      const parsed = TransferWorkspaceOwnershipSchema.safeParse({ newOwnerUserId: validUuid });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.newOwnerUserId).toBe(validUuid);
      }
    });

    it("rejects invalid UUID strings", () => {
      expect(TransferWorkspaceOwnershipSchema.safeParse({ newOwnerUserId: "not-a-uuid" }).success).toBe(false);
      expect(TransferWorkspaceOwnershipSchema.safeParse({ newOwnerUserId: "" }).success).toBe(false);
    });
  });

  describe("ArchiveWorkspaceSchema", () => {
    it("defaults archive to true when not provided", () => {
      const parsed = ArchiveWorkspaceSchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.archive).toBe(true);
      }
    });

    it("accepts explicit boolean values", () => {
      const unarchive = ArchiveWorkspaceSchema.safeParse({ archive: false });
      expect(unarchive.success).toBe(true);
      if (unarchive.success) {
        expect(unarchive.data.archive).toBe(false);
      }
    });
  });

  describe("WorkspaceReportQuerySchema", () => {
    it("defaults format to json", () => {
      const parsed = WorkspaceReportQuerySchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.format).toBe("json");
      }
    });

    it("accepts csv format", () => {
      const parsed = WorkspaceReportQuerySchema.safeParse({ format: "csv" });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.format).toBe("csv");
      }
    });

    it("rejects unsupported format types", () => {
      expect(WorkspaceReportQuerySchema.safeParse({ format: "pdf" }).success).toBe(false);
      expect(WorkspaceReportQuerySchema.safeParse({ format: "xml" }).success).toBe(false);
    });
  });
});
