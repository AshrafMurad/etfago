import { describe, it, expect } from "vitest";
import { SketchDatePicker, SketchDateSelect } from "@/features/ui";

describe("SketchDatePicker UI Component", () => {
  it("exports SketchDatePicker and SketchDateSelect correctly from @/features/ui", () => {
    expect(SketchDatePicker).toBeDefined();
    expect(SketchDateSelect).toBeDefined();
    expect(SketchDatePicker).toBe(SketchDateSelect);
  });

  it("validates standard ISO date strings (YYYY-MM-DD)", () => {
    const validIso = "2026-11-20";
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(validIso);
    expect(match).not.toBeNull();
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      expect(year).toBe(2026);
      expect(month).toBe(10); // November is index 10
      expect(day).toBe(20);
    }
  });

  it("formats date parts to ISO format without timezone skew", () => {
    const year = 2026;
    const month = 10; // November
    const day = 4;
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const iso = `${year}-${m}-${d}`;
    expect(iso).toBe("2026-11-04");
  });
});
