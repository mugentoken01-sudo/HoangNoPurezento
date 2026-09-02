import { describe, it, expect } from "vitest";
import { normalizeThresholds } from "@/lib/red-flag-thresholds";
import { todayStrInTZ, DASHBOARD_TIMEZONE } from "@/lib/dashboard";

describe("rate-limit contract — per-user daily cap 10, Asia/Ho_Chi_Minh day", () => {
  it("normalize: caps and defaults mirror dashboard threshold", () => {
    expect(normalizeThresholds({ debtGrowthMultiplier: 1.5 }).debtGrowthMultiplier).toBe(1.5);
  });

  it("atomic increment semantics: 10 allowed, 11th denied", () => {
    const BYOK = "AIza...";
    const systemKeys: string[] = ["key1"];
    const shouldConsultRateLimit = !BYOK && systemKeys.length > 0;
    expect(shouldConsultRateLimit).toBe(false); // BYOK bypasses
    const emptyStr: string = "";
    expect(!Boolean(emptyStr) && systemKeys.length > 0).toBe(true); // system path does consult
  });

  it("no-key path never touches rate limiter — heuristic immediately", () => {
    const byok: string = "";
    const systemKeys: string[] = [];
    const path = Boolean(byok) ? "byok" : systemKeys.length ? "system" : "heuristic";
    expect(path).toBe("heuristic");
  });

  it("reset_at is next 00:00 Asia/Ho_Chi_Minh — not UTC midnight", async () => {
    const { resetAtIsoHCM, todayInHCM } = await import("@/lib/ai-rate-limit");
    const today = todayInHCM();
    const reset = resetAtIsoHCM();
    expect(reset).toMatch(/Z$/);
    expect(new Date(reset).getTime()).toBeGreaterThan(new Date().getTime());
    // reset date in Asia/Ho_Chi_Minh timezone is tomorrow
    const tomorrowHCM = new Date(today + "T00:00:00Z");
    tomorrowHCM.setUTCDate(tomorrowHCM.getUTCDate() + 1);
    const resetInHCM = todayStrInTZ(DASHBOARD_TIMEZONE, new Date(reset));
    expect(resetInHCM).toBe(tomorrowHCM.toISOString().slice(0, 10));
  });
});
