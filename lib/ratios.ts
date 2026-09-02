// RM Cockpit — Ratio Engine (on-write, API layer)
// Pure functions: input = FS row (+ optional prev) + thresholds → ratios / flags
// P-5 hardened: bigint may arrive as string — coerce via Number() at entry.
// Thresholds are RM-configurable (like Dashboard pending threshold) — RM chỉnh qua UI.

import type { RedFlagThresholds } from "./red-flag-thresholds";
import { DEFAULT_THRESHOLDS } from "./red-flag-thresholds";

export type FSInput = {
  revenue?: number | string | null;
  cogs?: number | string | null;
  net_income?: number | string | null;
  ebit?: number | string | null;
  ebitda?: number | string | null;
  interest_expense?: number | string | null;
  total_assets?: number | string | null;
  total_liabilities?: number | string | null;
  total_equity?: number | string | null;
  current_assets?: number | string | null;
  current_liabilities?: number | string | null;
  inventory?: number | string | null;
  receivables?: number | string | null;
  payables?: number | string | null;
  cfo?: number | string | null;
  total_debt?: number | string | null;
  cash?: number | string | null;
};

export type RatioOutput = {
  revenue_growth: number | null;
  net_income_growth: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;
  debt_to_equity: number | null;
  debt_to_ebitda: number | null;
  interest_coverage: number | null;
  cfo_to_net_income: number | null;
  receivable_days: number | null;
  inventory_days: number | null;
  payable_days: number | null;
};

function toNum(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

function div(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

function normalizeFS(fs: FSInput): Required<{ [K in keyof FSInput]: number | null }> {
  const out: Record<string, number | null> = {};
  for (const k of Object.keys(fs) as (keyof FSInput)[]) {
    out[k as string] = toNum(fs[k]);
  }
  return out as Required<{ [K in keyof FSInput]: number | null }>;
}

export function computeRatios(currRaw: FSInput, prevRaw: FSInput | null): RatioOutput {
  const curr = normalizeFS(currRaw);
  const prev = prevRaw ? normalizeFS(prevRaw) : null;
  return {
    revenue_growth: prev?.revenue ? (curr.revenue! - prev.revenue) / prev.revenue : null,
    net_income_growth: prev?.net_income ? (curr.net_income! - prev.net_income) / Math.abs(prev.net_income!) : null,
    current_ratio: div(curr.current_assets, curr.current_liabilities),
    quick_ratio: curr.current_assets != null && curr.current_liabilities != null && curr.inventory != null
      ? div(curr.current_assets - curr.inventory, curr.current_liabilities) : div(curr.current_assets, curr.current_liabilities),
    debt_to_equity: div(curr.total_debt, curr.total_equity),
    debt_to_ebitda: div(curr.total_debt, curr.ebitda),
    interest_coverage: div(curr.ebit, curr.interest_expense),
    cfo_to_net_income: div(curr.cfo, curr.net_income),
    receivable_days: curr.receivables != null && curr.revenue ? (curr.receivables * 365) / curr.revenue : null,
    inventory_days: curr.inventory != null && curr.cogs ? (curr.inventory * 365) / curr.cogs : null,
    payable_days: curr.payables != null && curr.cogs ? (curr.payables * 365) / curr.cogs : null,
  };
}

// Rule-based red-flag checks — thresholds configurable (RM chỉnh qua UI như pending threshold)
export function evaluateRedFlags(
  currRaw: FSInput,
  prevRaw: FSInput | null,
  ratios: RatioOutput,
  thresholds: RedFlagThresholds = DEFAULT_THRESHOLDS,
): { rule: string; severity: "low"|"medium"|"high"; description: string }[] {
  const curr = normalizeFS(currRaw);
  const prev = prevRaw ? normalizeFS(prevRaw) : null;
  const t = thresholds;
  const flags: { rule: string; severity: "low"|"medium"|"high"; description: string }[] = [];
  if (ratios.revenue_growth != null && prev?.total_debt != null && curr.total_debt != null && prev.total_debt !== 0) {
    const debtGrowth = (curr.total_debt - prev.total_debt) / prev.total_debt;
    if (debtGrowth > ratios.revenue_growth * t.debtGrowthMultiplier && debtGrowth > 0) {
      flags.push({ rule: "debt_growth_gt_revenue", severity: "high", description: `Debt grew ${(debtGrowth*100).toFixed(1)}% vs revenue ${(ratios.revenue_growth*100).toFixed(1)}% (threshold ×${t.debtGrowthMultiplier}) — leverage outpacing scale.` });
    }
  }
  if (curr.net_income != null && curr.net_income > 0 && curr.cfo != null && curr.cfo < 0) {
    flags.push({ rule: "profit_without_cash", severity: "high", description: `Net income positive (${curr.net_income}) but CFO negative (${curr.cfo}) — possible receivables/early recognition issue.` });
  }
  if (ratios.current_ratio != null && ratios.current_ratio < t.currentRatioCritical) {
    flags.push({ rule: "current_ratio_below_1", severity: "high", description: `Current ratio ${ratios.current_ratio.toFixed(2)} < ${t.currentRatioCritical} — liquidity risk.` });
  } else if (ratios.current_ratio != null && ratios.current_ratio < t.currentRatioLow) {
    flags.push({ rule: "current_ratio_low", severity: "medium", description: `Current ratio ${ratios.current_ratio.toFixed(2)} < ${t.currentRatioLow} — thin liquidity buffer.` });
  }
  if (ratios.interest_coverage != null && ratios.interest_coverage < t.interestCoverageLow) {
    flags.push({ rule: "interest_coverage_lt_2", severity: ratios.interest_coverage < 1 ? "high" : "medium", description: `Interest coverage ${ratios.interest_coverage.toFixed(2)}x < ${t.interestCoverageLow}x — debt service risk.` });
  }
  if (prev?.receivables != null && curr.receivables != null && prev.revenue && curr.revenue) {
    const prevDays = (prev.receivables * 365) / prev.revenue;
    const currDays = (curr.receivables * 365) / curr.revenue!;
    if (prevDays > 0 && (currDays - prevDays) / prevDays > t.receivableSpike) {
      flags.push({ rule: "receivable_days_spike", severity: "medium", description: `Receivable days jumped ${prevDays.toFixed(0)} → ${currDays.toFixed(0)} (+${((currDays-prevDays)/prevDays*100).toFixed(0)}% > ${t.receivableSpike*100}%) — collection slowdown.` });
    }
  }
  return flags;
}
