// RM Cockpit — M5 P-5 hardening: bigint string handling for Postgres bigint via PostgREST
// Postgres bigint columns arrive as string when large; ratios must not silently concat.

import { describe, it, expect } from "vitest";
import { computeRatios, evaluateRedFlags } from "@/lib/ratios";

describe("ratios: bigint string hardening (P-5)", () => {
  it("computeRatios coerces string numerics — same as numbers", () => {
    const currNum = { revenue: 80_000_000_000, cogs: 60_000_000_000, current_assets: 22_000_000_000, current_liabilities: 18_000_000_000, inventory: 9_000_000_000, total_debt: 20_000_000_000, total_equity: 17_000_000_000, ebit: 5_000_000_000, interest_expense: 1_800_000_000, receivables: 7_000_000_000, payables: 5_000_000_000, cfo: 1_100_000_000, net_income: 3_200_000_000, ebitda: 6_500_000_000 };
    const currStr = Object.fromEntries(Object.entries(currNum).map(([k, v]) => [k, String(v)])) as never;
    const rNum = computeRatios(currNum, null);
    const rStr = computeRatios(currStr, null);
    expect(rStr.current_ratio).toBeCloseTo(rNum.current_ratio!);
    expect(rStr.debt_to_equity).toBeCloseTo(rNum.debt_to_equity!);
    expect(rStr.receivable_days).toBeCloseTo(rNum.receivable_days!);
    expect(rStr.interest_coverage).toBeCloseTo(rNum.interest_coverage!);
  });

  it("does not string-concat on + (receivables+inventory path)", () => {
    const curr = { current_assets: "22000000000" as never, current_liabilities: "18000000000" as never, inventory: "9000000000" as never };
    const r = computeRatios(curr, null);
    // quick_ratio = (22B-9B)/18B = 13/18 ≈ 0.722
    expect(r.quick_ratio).toBeCloseTo(13 / 18);
    expect(typeof r.quick_ratio).toBe("number");
  });

  it("evaluateRedFlags works with string inputs", () => {
    const curr = { revenue: "80000000000", cogs: "60000000000", net_income: "3200000000", current_assets: "22000000000", current_liabilities: "18000000000", inventory: "9000000000", total_debt: "20000000000", total_equity: "17000000000", ebit: "5000000000", ebitda: "6500000000", interest_expense: "1800000000", receivables: "7000000000", payables: "5000000000", cfo: "-100000000" } as never;
    const prev = { revenue: "70000000000", total_debt: "15000000000", receivables: "5000000000", cogs: "50000000000" } as never;
    const ratios = computeRatios(curr, prev);
    const flags = evaluateRedFlags(curr, prev, ratios);
    expect(flags.some(f => f.rule === "profit_without_cash")).toBe(true);
  });

  it("null/empty string → null ratio, not 0 or NaN", () => {
    const r = computeRatios({ revenue: null, current_assets: "", current_liabilities: null } as never, null);
    expect(r.current_ratio).toBeNull();
    expect(r.revenue_growth).toBeNull();
  });
});

describe("ratios: multi-year growth & thresholds (regression)", () => {
  it("revenue_growth uses prev.revenue", () => {
    const curr = { revenue: 80_000_000_000 } as never;
    const prev = { revenue: 70_000_000_000 } as never;
    const r = computeRatios(curr, prev);
    expect(r.revenue_growth).toBeCloseTo(10 / 70);
  });
  it("current_ratio <1 triggers high flag, <1.2 medium", () => {
    const curr = { current_assets: 18_000_000_000, current_liabilities: 20_000_000_000 } as never;
    const r = computeRatios(curr, null);
    const f = evaluateRedFlags(curr, null, r);
    expect(f.some(x => x.rule === "current_ratio_below_1")).toBe(true);
  });
});
