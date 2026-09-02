import { describe, it, expect } from "vitest";
import { parseFinancialRows } from "@/lib/parse-financial-excel";

describe("parseFinancialRows (pure, no I/O)", () => {
  it("valid file → rows, no errors", () => {
    const json = [
      { period: "2023", revenue: 80000000000, cogs: 60000000000, net_income: 3200000000 },
      { period: "2024", revenue: 92000000000, cogs: 68000000000 },
    ];
    const r = parseFinancialRows(json);
    expect(r.errors).toHaveLength(0);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].period).toBe("2023");
    expect(r.rows[1].period).toBe("2024");
  });

  it("missing required period column → whole file rejected", () => {
    const json = [{ revenue: 100, cogs: 50 }];
    const r = parseFinancialRows(json);
    expect(r.rows).toHaveLength(0);
    expect(r.errors[0]).toMatch(/Missing required column "period"/);
  });

  it("non-numeric in numeric column → error for that row", () => {
    const json = [{ period: "2023", revenue: "not-a-number" }];
    const r = parseFinancialRows(json);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]).toMatch(/non-numeric/);
  });

  it("empty sheet → error", () => {
    const r = parseFinancialRows([]);
    expect(r.errors[0]).toMatch(/empty/i);
  });

  it("unknown extra columns ignored, not error", () => {
    const json = [{ period: "2023", revenue: 100, unknown_col: "hello", extra: 123 }];
    const r = parseFinancialRows(json);
    expect(r.errors).toHaveLength(0);
    expect(r.rows).toHaveLength(1);
  });

  it("comma-formatted numbers coerce correctly", () => {
    const json = [{ period: "2023", revenue: "80,000,000,000" }];
    const r = parseFinancialRows(json);
    expect(r.rows[0].revenue).toBe(80000000000);
  });

  it("empty strings in numeric cols → null, not error", () => {
    const json = [{ period: "2023", revenue: "", cogs: null }];
    const r = parseFinancialRows(json);
    expect(r.rows[0].revenue).toBeNull();
    expect(r.rows[0].cogs).toBeNull();
  });
});
