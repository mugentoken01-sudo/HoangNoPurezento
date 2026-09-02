// RM Cockpit — M5 follow-on: Red-flag thresholds configurable by RM (like Dashboard pending threshold)
// Stored in localStorage (client), passed to API on create/patch so server evaluates with same thresholds.
// Server falls back to DEFAULT_THRESHOLDS if not provided.

export type RedFlagThresholds = {
  debtGrowthMultiplier: number;   // debt growth > revenue_growth * X  (default 1.5)
  interestCoverageLow: number;    // coverage < X  (default 2)
  currentRatioCritical: number;   // < X → high  (default 1)
  currentRatioLow: number;        // < X → medium (default 1.2)
  receivableSpike: number;        // (curr-prev)/prev > X  (default 0.30 = 30%)
};

export const DEFAULT_THRESHOLDS: RedFlagThresholds = {
  debtGrowthMultiplier: 1.5,
  interestCoverageLow: 2,
  currentRatioCritical: 1,
  currentRatioLow: 1.2,
  receivableSpike: 0.30,
};

const KEY = "rm-cockpit:red-flag-thresholds";

export function loadThresholds(): RedFlagThresholds {
  if (typeof window === "undefined") return DEFAULT_THRESHOLDS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    const parsed = JSON.parse(raw) as Partial<RedFlagThresholds>;
    return {
      debtGrowthMultiplier: Number.isFinite(parsed.debtGrowthMultiplier) ? parsed.debtGrowthMultiplier! : DEFAULT_THRESHOLDS.debtGrowthMultiplier,
      interestCoverageLow: Number.isFinite(parsed.interestCoverageLow) ? parsed.interestCoverageLow! : DEFAULT_THRESHOLDS.interestCoverageLow,
      currentRatioCritical: Number.isFinite(parsed.currentRatioCritical) ? parsed.currentRatioCritical! : DEFAULT_THRESHOLDS.currentRatioCritical,
      currentRatioLow: Number.isFinite(parsed.currentRatioLow) ? parsed.currentRatioLow! : DEFAULT_THRESHOLDS.currentRatioLow,
      receivableSpike: Number.isFinite(parsed.receivableSpike) ? parsed.receivableSpike! : DEFAULT_THRESHOLDS.receivableSpike,
    };
  } catch { return DEFAULT_THRESHOLDS; }
}

export function saveThresholds(v: RedFlagThresholds) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(v));
}

export function normalizeThresholds(v: Partial<RedFlagThresholds>): RedFlagThresholds {
  return {
    debtGrowthMultiplier: clamp(v.debtGrowthMultiplier, 1, 5, DEFAULT_THRESHOLDS.debtGrowthMultiplier),
    interestCoverageLow: clamp(v.interestCoverageLow, 0.5, 10, DEFAULT_THRESHOLDS.interestCoverageLow),
    currentRatioCritical: clamp(v.currentRatioCritical, 0.5, 3, DEFAULT_THRESHOLDS.currentRatioCritical),
    currentRatioLow: clamp(v.currentRatioLow, 0.5, 3, DEFAULT_THRESHOLDS.currentRatioLow),
    receivableSpike: clamp(v.receivableSpike, 0.05, 2, DEFAULT_THRESHOLDS.receivableSpike),
  };
}

function clamp(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
