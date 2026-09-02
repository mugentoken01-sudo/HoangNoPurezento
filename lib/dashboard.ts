// RM Cockpit Module 4 — Dashboard metric semantics & date policy
// Timezone: Asia/Ho_Chi_Minh (UTC+7, no DST). All "today/overdue/pending" computed on calendar-day boundaries in that zone.
// Shared by server summary endpoint and unit tests so widgets never duplicate logic.

import { PIPELINE_STAGES, type PipelineStage } from "./pipeline-stages";

export const DASHBOARD_TIMEZONE = "Asia/Ho_Chi_Minh" as const;
export const DEFAULT_THRESHOLD_DAYS = 7;

// ── Date helpers ────────────────────────────────────────────────────────
// We avoid adding date-fns-tz to keep bundle minimal; Vietnam has fixed +07:00.
// For correctness under server UTC vs local, we use Intl to derive the calendar date in the target zone.

export function todayStrInTZ(tz: string = DASHBOARD_TIMEZONE, now: Date = new Date()): string {
  // Returns YYYY-MM-DD in tz
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now); // en-CA gives YYYY-MM-DD
}

export function parseDateOnly(s: string | null | undefined): string | null {
  if (!s) return null;
  // Accept YYYY-MM-DD; reject malformed
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function isOverdue(dateStr: string | null, todayStr: string): boolean {
  const d = parseDateOnly(dateStr);
  if (!d) return false;
  return d < todayStr;
}

export function isToday(dateStr: string | null, todayStr: string): boolean {
  return parseDateOnly(dateStr) === todayStr;
}

// Calendar-day difference: todayStr - dateStr in tz. Uses UTC midnight arithmetic on the date-only values.
export function daysBetween(dateStr: string | null, todayStr: string): number | null {
  const d = parseDateOnly(dateStr);
  if (!d || !todayStr) return null;
  const a = new Date(d + "T00:00:00Z").getTime();
  const b = new Date(todayStr + "T00:00:00Z").getTime();
  return Math.floor((b - a) / 86400000);
}

export function daysSinceIso(iso: string | null, todayStr: string): number | null {
  if (!iso) return null;
  // Derive date part in target tz from the ISO timestamp
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const datePart = todayStrInTZ(DASHBOARD_TIMEZONE, d);
  return daysBetween(datePart, todayStr);
}

// ── Widget row types (matches /api/dashboard/summary contract) ─────────
export type FollowUpRow = {
  note_id: string;
  customer_id: string;
  company_name: string;
  next_action_type: string | null;
  next_action_date: string;
  overdue: boolean;
  content: string;
  created_at: string;
};

export type TodayTaskRow = {
  task_id: string;
  customer_id: string;
  company_name: string;
  title: string;
  due_date: string;
  status: string;
  source: string;
  overdue: boolean;
};

export type PipelineCount = { stage: PipelineStage; count: number };

export type PendingRow = {
  customer_id: string;
  company_name: string;
  stage: string;
  last_activity_at: string | null;
  last_activity_type: "note" | "task" | null;
  inactive_days: number | null;
};

export type RiskSeverity = "low" | "medium" | "high";

export type RiskDigestRow = {
  customer_id: string;
  company_name: string;
  stage: PipelineStage;
  worst_severity: RiskSeverity;
  flag_count: number;
  latest_rule_triggered: string;
  latest_description: string;
  latest_flag_at: string;
};

export type DashboardSummary = {
  generated_at: string;
  timezone: typeof DASHBOARD_TIMEZONE;
  threshold_days: number;
  follow_ups: FollowUpRow[];
  today_tasks: TodayTaskRow[];
  pipeline: PipelineCount[];
  pending_customers: PendingRow[];
  risk_digest: RiskDigestRow[];
  errors?: { widget: string; message: string }[];
};

// ── Pending threshold validation ─────────────────────────────────��──────
export function normalizeThreshold(raw: unknown): number {
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_THRESHOLD_DAYS;
  if (n > 365) return 365;
  return Math.floor(n);
}

// ── Deterministic sort helpers (shared across widgets) ──────────────────
export function sortFollowUps(rows: FollowUpRow[]): FollowUpRow[] {
  return [...rows].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.next_action_date !== b.next_action_date) return a.next_action_date.localeCompare(b.next_action_date);
    return a.company_name.localeCompare(b.company_name);
  });
}

export function sortTodayTasks(rows: TodayTaskRow[]): TodayTaskRow[] {
  return [...rows].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
    return a.company_name.localeCompare(b.company_name);
  });
}

// ── Stage count helper ──────────────────────────────────────────────────
export function pipelineCountsFromCustomers(customers: { stage: string }[]): PipelineCount[] {
  const map = new Map<string, number>();
  for (const s of PIPELINE_STAGES) map.set(s, 0);
  for (const c of customers) {
    const k = (c.stage as PipelineStage) ?? "lead";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return PIPELINE_STAGES.map(s => ({ stage: s, count: map.get(s) ?? 0 }));
}

// ── Portfolio Risk Digest helpers ────────────────────────────────────────
export const SEVERITY_RANK: Record<RiskSeverity, number> = { high: 0, medium: 1, low: 2 };

export function buildRiskDigest(
  customers: { id: string; company_name: string; stage: string; status?: string | null }[],
  flags: { customer_id: string; severity: RiskSeverity; rule_triggered: string; description: string; created_at: string }[]
): RiskDigestRow[] {
  const custMap = new Map(
    customers
      .filter((c) => c.status !== "lost")
      .map((c) => [c.id, c])
  );
  const grouped = new Map<string, RiskDigestRow>();

  for (const f of flags) {
    const cust = custMap.get(f.customer_id);
    if (!cust) continue;

    const existing = grouped.get(f.customer_id);
    if (!existing) {
      grouped.set(f.customer_id, {
        customer_id: f.customer_id,
        company_name: cust.company_name,
        stage: (cust.stage as PipelineStage) || "lead",
        worst_severity: f.severity,
        flag_count: 1,
        latest_rule_triggered: f.rule_triggered,
        latest_description: f.description,
        latest_flag_at: f.created_at,
      });
    } else {
      existing.flag_count += 1;
      if (SEVERITY_RANK[f.severity] < SEVERITY_RANK[existing.worst_severity]) {
        existing.worst_severity = f.severity;
      }
      if (f.created_at > existing.latest_flag_at) {
        existing.latest_rule_triggered = f.rule_triggered;
        existing.latest_description = f.description;
        existing.latest_flag_at = f.created_at;
      } else if (f.created_at === existing.latest_flag_at) {
        if (SEVERITY_RANK[f.severity] < SEVERITY_RANK[existing.worst_severity]) {
          existing.latest_rule_triggered = f.rule_triggered;
          existing.latest_description = f.description;
        }
      }
    }
  }

  return Array.from(grouped.values());
}

export function sortRiskDigest(rows: RiskDigestRow[]): RiskDigestRow[] {
  return [...rows].sort((a, b) => {
    const diffSev = SEVERITY_RANK[a.worst_severity] - SEVERITY_RANK[b.worst_severity];
    if (diffSev !== 0) return diffSev;
    const diffTime = b.latest_flag_at.localeCompare(a.latest_flag_at);
    if (diffTime !== 0) return diffTime;
    return a.company_name.localeCompare(b.company_name);
  });
}

