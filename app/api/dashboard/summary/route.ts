export const dynamic = "force-dynamic";
// RM Cockpit Module 4 — GET /api/dashboard/summary
// Single server-side summary: owner-scoped, bounded, timezone-aware, partial-failure isolated.
// Query: ?threshold=7  (days, 1..365, default 7)

import { json, error, requireUser } from "@/lib/api-helpers";
import {
  DASHBOARD_TIMEZONE,
  todayStrInTZ,
  parseDateOnly,
  isOverdue,
  normalizeThreshold,
  sortFollowUps,
  sortTodayTasks,
  pipelineCountsFromCustomers,
  buildRiskDigest,
  sortRiskDigest,
  type FollowUpRow,
  type TodayTaskRow,
  type PendingRow,
  type RiskDigestRow,
  type RiskSeverity,
  type DashboardSummary,
} from "@/lib/dashboard";
import { PIPELINE_STAGES } from "@/lib/pipeline-stages";

export async function GET(req: Request) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);

  const url = new URL(req.url);
  const threshold_days = normalizeThreshold(url.searchParams.get("threshold"));
  const todayStr = todayStrInTZ(DASHBOARD_TIMEZONE, new Date());
  const generated_at = new Date().toISOString();
  const errors: { widget: string; message: string }[] = [];

  // Bounded parallel fetches — all owner-scoped via RLS (supabase client is authenticated)
  // We use allSettled so one widget failure doesn't erase others.

  const pCustomers = supabase.from("customers").select("id, company_name, stage, status, created_at").order("created_at", { ascending: false }).limit(500);
  const pNotesFollow = supabase
    .from("notes")
    .select("id, customer_id, content, next_action_type, next_action_date, created_at, customers(company_name)")
    .not("next_action_date", "is", null)
    .lte("next_action_date", todayStr)
    .order("next_action_date", { ascending: true })
    .limit(100);
  const pTasksToday = supabase
    .from("tasks")
    .select("id, customer_id, title, due_date, status, source, customers(company_name)")
    .not("due_date", "is", null)
    .lte("due_date", todayStr)
    .neq("status", "done")
    .order("due_date", { ascending: true })
    .limit(100);
  // For pending: need last activity per customer — fetch recent notes/tasks (bounded) and reduce
  const pNotesRecent = supabase.from("notes").select("customer_id, created_at").order("created_at", { ascending: false }).limit(1000);
  const pTasksRecent = supabase.from("tasks").select("customer_id, created_at").order("created_at", { ascending: false }).limit(1000);
  // For risk digest: active red flags across portfolio (bounded)
  const pRedFlags = supabase
    .from("red_flags")
    .select("customer_id, severity, rule_triggered, description, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  const [rCustomers, rNotesFollow, rTasksToday, rNotesRecent, rTasksRecent, rRedFlags] = await Promise.allSettled([
    pCustomers,
    pNotesFollow,
    pTasksToday,
    pNotesRecent,
    pTasksRecent,
    pRedFlags,
  ]);

  // --- Pipeline (from customers) ---
  let pipeline = PIPELINE_STAGES.map(s => ({ stage: s as never, count: 0 }));
  let customers: { id: string; company_name: string; stage: string; status?: string | null; created_at: string }[] = [];
  if (rCustomers.status === "fulfilled" && !rCustomers.value.error) {
    customers = (rCustomers.value.data as typeof customers) ?? [];
    pipeline = pipelineCountsFromCustomers(customers) as typeof pipeline;
  } else {
    const msg = rCustomers.status === "rejected" ? String(rCustomers.reason) : (rCustomers.value as { error: { message: string } | null }).error?.message ?? "Failed to load customers";
    errors.push({ widget: "pipeline", message: msg });
  }

  // --- Follow-ups ---
  let follow_ups: FollowUpRow[] = [];
  if (rNotesFollow.status === "fulfilled" && !rNotesFollow.value.error) {
    const rows = (rNotesFollow.value.data as unknown as {
      id: string; customer_id: string; content: string; next_action_type: string | null; next_action_date: string; created_at: string;
      customers: { company_name: string } | null;
    }[]) ?? [];
    // Enrich company_name fallback via customers map if join missing
    const custMap = new Map(customers.map(c => [c.id, c.company_name]));
    follow_ups = sortFollowUps(rows.map(r => ({
      note_id: r.id,
      customer_id: r.customer_id,
      company_name: r.customers?.company_name ?? custMap.get(r.customer_id) ?? "—",
      next_action_type: r.next_action_type,
      next_action_date: r.next_action_date,
      overdue: isOverdue(r.next_action_date, todayStr),
      content: r.content,
      created_at: r.created_at,
    })));
  } else if (rNotesFollow.status === "fulfilled" && rNotesFollow.value.error) {
    errors.push({ widget: "follow_ups", message: rNotesFollow.value.error.message });
  } else if (rNotesFollow.status === "rejected") {
    errors.push({ widget: "follow_ups", message: String(rNotesFollow.reason) });
  }

  // --- Today tasks ---
  let today_tasks: TodayTaskRow[] = [];
  if (rTasksToday.status === "fulfilled" && !rTasksToday.value.error) {
    const rows = (rTasksToday.value.data as unknown as {
      id: string; customer_id: string; title: string; due_date: string; status: string; source: string;
      customers: { company_name: string } | null;
    }[]) ?? [];
    const custMap = new Map(customers.map(c => [c.id, c.company_name]));
    today_tasks = sortTodayTasks(rows.map(r => ({
      task_id: r.id,
      customer_id: r.customer_id,
      company_name: r.customers?.company_name ?? custMap.get(r.customer_id) ?? "—",
      title: r.title,
      due_date: r.due_date,
      status: r.status,
      source: r.source,
      overdue: r.due_date < todayStr,
    })));
  } else if (rTasksToday.status === "fulfilled" && rTasksToday.value.error) {
    errors.push({ widget: "today_tasks", message: rTasksToday.value.error.message });
  } else if (rTasksToday.status === "rejected") {
    errors.push({ widget: "today_tasks", message: String(rTasksToday.reason) });
  }

  // --- Pending (no Note/Task newer than threshold) ---
  let pending_customers: PendingRow[] = [];
  const notesRecentOk = rNotesRecent.status === "fulfilled" && !rNotesRecent.value.error;
  const tasksRecentOk = rTasksRecent.status === "fulfilled" && !rTasksRecent.value.error;
  if (customers.length && (notesRecentOk || tasksRecentOk)) {
    const notesRecent = notesRecentOk ? ((rNotesRecent.value as { data: { customer_id: string; created_at: string }[] }).data ?? []) : [];
    const tasksRecent = tasksRecentOk ? ((rTasksRecent.value as { data: { customer_id: string; created_at: string }[] }).data ?? []) : [];
    if (!notesRecentOk) {
      const msg = rNotesRecent.status === "fulfilled" ? (rNotesRecent.value as { error?: { message: string } }).error?.message : String((rNotesRecent as PromiseRejectedResult).reason);
      errors.push({ widget: "pending_notes_source", message: msg || "Failed to fetch recent notes" });
    }
    if (!tasksRecentOk) {
      const msg = rTasksRecent.status === "fulfilled" ? (rTasksRecent.value as { error?: { message: string } }).error?.message : String((rTasksRecent as PromiseRejectedResult).reason);
      errors.push({ widget: "pending_tasks_source", message: msg || "Failed to fetch recent tasks" });
    }

    // Last activity per customer: max(created_at) across notes+tasks
    const lastMap = new Map<string, { at: string; type: "note" | "task" }>();
    for (const n of notesRecent) {
      const prev = lastMap.get(n.customer_id);
      if (!prev || n.created_at > prev.at) lastMap.set(n.customer_id, { at: n.created_at, type: "note" });
    }
    for (const t of tasksRecent) {
      const prev = lastMap.get(t.customer_id);
      if (!prev || t.created_at > prev.at) lastMap.set(t.customer_id, { at: t.created_at, type: "task" });
    }

    const todayMs = new Date(todayStr + "T00:00:00Z").getTime();
    for (const c of customers) {
      const last = lastMap.get(c.id);
      if (!last) {
        // No activity — pending if customer older than threshold
        const createdDays = Math.floor((todayMs - new Date(c.created_at).getTime()) / 86400000);
        if (createdDays >= threshold_days) {
          pending_customers.push({
            customer_id: c.id,
            company_name: c.company_name,
            stage: c.stage,
            last_activity_at: null,
            last_activity_type: null,
            inactive_days: createdDays,
          });
        }
        continue;
      }
      // Calendar-day difference in RM timezone: derive date part of last.at in tz, then diff to todayStr
      const lastDateStr = todayStrInTZ(DASHBOARD_TIMEZONE, new Date(last.at));
      const diff = Math.floor((todayMs - new Date(lastDateStr + "T00:00:00Z").getTime()) / 86400000);
      if (diff >= threshold_days) {
        pending_customers.push({
          customer_id: c.id,
          company_name: c.company_name,
          stage: c.stage,
          last_activity_at: last.at,
          last_activity_type: last.type,
          inactive_days: diff,
        });
      }
    }
    // Deterministic: most stale first, then company name
    pending_customers.sort((a, b) => (b.inactive_days ?? 0) - (a.inactive_days ?? 0) || a.company_name.localeCompare(b.company_name));
  } else if (!customers.length && rCustomers.status === "fulfilled" && !rCustomers.value.error) {
    // No customers — pending is empty, not an error
  } else {
    if (rNotesRecent.status === "rejected") errors.push({ widget: "pending", message: String(rNotesRecent.reason) });
    if (rTasksRecent.status === "rejected") errors.push({ widget: "pending", message: String(rTasksRecent.reason) });
  }

  // --- Portfolio Risk Digest ---
  let risk_digest: RiskDigestRow[] = [];
  if (rRedFlags.status === "fulfilled" && !rRedFlags.value.error) {
    const flagRows = (rRedFlags.value.data as unknown as {
      customer_id: string;
      severity: RiskSeverity;
      rule_triggered: string;
      description: string;
      created_at: string;
    }[]) ?? [];
    risk_digest = sortRiskDigest(buildRiskDigest(customers, flagRows)).slice(0, 20);
  } else if (rRedFlags.status === "fulfilled" && rRedFlags.value.error) {
    errors.push({ widget: "risk_digest", message: rRedFlags.value.error.message });
  } else if (rRedFlags.status === "rejected") {
    errors.push({ widget: "risk_digest", message: String(rRedFlags.reason) });
  }

  const payload: DashboardSummary = {
    generated_at,
    timezone: DASHBOARD_TIMEZONE,
    threshold_days,
    follow_ups,
    today_tasks,
    pipeline,
    pending_customers,
    risk_digest,
    ...(errors.length ? { errors } : {}),
  };

  return json(payload);
}
