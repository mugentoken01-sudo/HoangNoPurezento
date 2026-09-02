// RM Cockpit Module 5 — Rate-limit helper (single place, re-used by both /api/ai/* routes)
// BYOK bypasses this entirely. System path calls canConsumeSystemQuota(ownerId) atomically.

import { createClient } from "@/lib/supabase/server";
import { todayStrInTZ, DASHBOARD_TIMEZONE } from "./dashboard";

export const SYSTEM_DAILY_CAP = 10;

export function todayInHCM(): string {
  return todayStrInTZ(DASHBOARD_TIMEZONE, new Date());
}

export function resetAtIsoHCM(): string {
  // Next 00:00 Asia/Ho_Chi_Minh as ISO UTC
  const t = todayInHCM();
  const nextDate = new Date(t + "T00:00:00Z");
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  // 00:00 HCMC = 17:00 UTC previous day — but we stored date as YYYY-MM-DD, so reset = next calendar day 00:00 HCMC
  // Equivalent UTC: 17:00Z of that next date's previous day — simpler: return next 00:00 HCMC as ISO
  // We use: new Date(`${nextDateStr}T00:00:00+07:00`).toISOString()
  const nextStr = nextDate.toISOString().slice(0, 10);
  return new Date(`${nextStr}T00:00:00+07:00`).toISOString();
}

export type RateLimitResult = { allowed: boolean; count: number; cap: number; remaining: number };

export async function canConsumeSystemQuota(ownerId: string, cap: number = SYSTEM_DAILY_CAP): Promise<RateLimitResult> {
  const supabase = await createClient();
  const today = todayInHCM();
  const { data, error } = await supabase.rpc("increment_ai_usage", {
    p_owner_id: ownerId,
    p_date: today,
    p_cap: cap,
  });
  if (error) {
    // If RPC not yet migrated (dev without 00005), fail open to allow dev but log
    console.warn("[ai-rate-limit] increment_ai_usage RPC failed:", error.message);
    return { allowed: true, count: 0, cap, remaining: cap };
  }
  const r = data as { allowed: boolean; count: number; cap: number };
  return { allowed: r.allowed, count: r.count, cap: r.cap, remaining: Math.max(0, r.cap - r.count) };
}
