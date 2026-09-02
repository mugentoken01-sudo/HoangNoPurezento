"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getDashboardSummary } from "@/lib/api-client";
import { DASHBOARD_TIMEZONE, DEFAULT_THRESHOLD_DAYS, normalizeThreshold, todayStrInTZ } from "@/lib/dashboard";
import type { DashboardSummary } from "@/lib/dashboard";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { PIPELINE_STAGES } from "@/lib/pipeline-stages";

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString("vi-VN"); } catch { return d; }
}
function fmtIso(iso: string) {
  try { return new Date(iso).toLocaleString("vi-VN", { timeZone: DASHBOARD_TIMEZONE }); } catch { return iso; }
}

export default function DashboardPage() {
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD_DAYS);
  const [custom, setCustom] = useState<string>(String(DEFAULT_THRESHOLD_DAYS));
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const genRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSummary = useCallback(async (t: number) => {
    const gen = ++genRef.current;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    setStale(!!data);
    try {
      const res = await getDashboardSummary(t, ac.signal);
      if (gen !== genRef.current) return;
      setData(res);
      setStale(false);
      setError(null);
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === "AbortError") return;
      if (gen !== genRef.current) return;
      const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? "Failed to load dashboard";
      if (!data) setError(msg);
      else setStale(true);
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    fetchSummary(threshold);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  const todayStr = todayStrInTZ(DASHBOARD_TIMEZONE, new Date());
  const pipelineErrors = data?.errors?.filter(e => e.widget === "pipeline") ?? [];
  const followErrors = data?.errors?.filter(e => e.widget.startsWith("follow")) ?? [];
  const todayErrors = data?.errors?.filter(e => e.widget.startsWith("today")) ?? [];
  const pendingErrors = data?.errors?.filter(e => e.widget.startsWith("pending")) ?? [];

  const onThresholdChange = (v: string) => {
    if (v === "custom") return;
    const n = normalizeThreshold(v);
    setThreshold(n);
    setCustom(String(n));
  };
  const onCustomApply = () => {
    const n = normalizeThreshold(custom);
    setThreshold(n);
    setCustom(String(n));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-widest text-zinc-400">OPERATIONS · DASHBOARD</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Today, at a glance.</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Follow-ups, due tasks, pipeline, and pending — all owner-scoped, bounded, and computed in <span className="font-mono text-xs rounded bg-zinc-100 px-1 py-0.5">{DASHBOARD_TIMEZONE}</span> calendar days.
              Today is <span className="font-medium text-zinc-700">{todayStr}</span> · Threshold <span className="font-medium">{threshold}d</span>
              {data?.generated_at && <span className="text-zinc-400"> · Updated {fmtIso(data.generated_at)}</span>}
              {stale && <span className="ml-2 rounded bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[11px] text-amber-800">stale</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => fetchSummary(threshold)} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500">Pending threshold</span>
          <select
            aria-label="Pending threshold"
            value={String(threshold) === custom ? String(threshold) : String(threshold)}
            onChange={e => onThresholdChange(e.target.value)}
            className="rounded-md border bg-white px-2 py-1.5 text-sm"
          >
            <option value="7">7 days (default)</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="custom">Custom…</option>
          </select>
          <input
            aria-label="Custom threshold days"
            type="number"
            min={1}
            max={365}
            value={custom}
            onChange={e => setCustom(e.target.value)}
            className="w-20 rounded-md border px-2 py-1.5 text-sm"
          />
          <Button variant="secondary" size="sm" onClick={onCustomApply}>Apply</Button>
          <span className="text-[11px] text-zinc-400">Calendar-day diff in {DASHBOARD_TIMEZONE} · 1–365</span>
        </div>
      </div>

      {error && (
        <Card><CardBody><p role="alert" className="text-sm text-red-600">{error}</p><Button variant="secondary" size="sm" className="mt-2" onClick={() => fetchSummary(threshold)}>Retry</Button></CardBody></Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <WidgetCard
          title="Follow-up today"
          count={data?.follow_ups.length}
          loading={loading && !data}
          error={followErrors[0]?.message ?? null}
          onRetry={() => fetchSummary(threshold)}
          stale={stale}
          empty={!!data && data.follow_ups.length === 0}
        >
          {!data ? null : data.follow_ups.length === 0 ? (
            <p className="text-sm text-zinc-500">No follow-ups due today. Overdue notes appear here with a distinct marker — not color alone.</p>
          ) : (
            <ul className="space-y-2">
              {data.follow_ups.slice(0, 20).map(r => (
                <li key={r.note_id} className={`rounded-lg border px-3 py-2 ${r.overdue ? "bg-amber-50 border-amber-200" : "bg-white"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${r.overdue ? "bg-amber-100 border-amber-200 text-amber-800" : "bg-zinc-50 border-zinc-200 text-zinc-700"}`}>
                      <span aria-hidden>{r.overdue ? "⚠" : "•"}</span> {r.overdue ? "Overdue" : "Due today"}
                    </span>
                    <span className="text-xs text-zinc-500">{fmtDate(r.next_action_date)}</span>
                    {r.next_action_type && <Badge value={r.next_action_type} />}
                  </div>
                  <Link href={`/customers/${r.customer_id}`} className="mt-1 block text-sm font-medium hover:underline">{r.company_name}</Link>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{r.content}</p>
                </li>
              ))}
              {data.follow_ups.length > 20 && <li className="text-xs text-zinc-400">Showing 20 of {data.follow_ups.length} — narrow by completing follow-ups.</li>}
            </ul>
          )}
        </WidgetCard>

        <WidgetCard
          title="Tasks today"
          count={data?.today_tasks.length}
          loading={loading && !data}
          error={todayErrors[0]?.message ?? null}
          onRetry={() => fetchSummary(threshold)}
          stale={stale}
          empty={!!data && data.today_tasks.length === 0}
        >
          {!data ? null : data.today_tasks.length === 0 ? (
            <p className="text-sm text-zinc-500">No tasks due today. Overdue tasks appear here until marked done — not silently omitted.</p>
          ) : (
            <ul className="space-y-2">
              {data.today_tasks.slice(0, 20).map(r => (
                <li key={r.task_id} className={`rounded-lg border px-3 py-2 ${r.overdue ? "bg-red-50 border-red-200" : "bg-white"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${r.overdue ? "bg-red-100 border-red-200 text-red-700" : "bg-zinc-50 border-zinc-200 text-zinc-700"}`}>
                      {r.overdue ? "Overdue" : "Due today"}
                    </span>
                    <span className="text-xs text-zinc-500">{fmtDate(r.due_date)}</span>
                    <Badge value={r.status} />
                    <Badge value={r.source} label={r.source === "auto_template" ? "auto" : r.source} />
                  </div>
                  <Link href={`/customers/${r.customer_id}`} className="mt-1 block text-sm font-medium hover:underline">{r.company_name} <span className="font-normal text-zinc-500">· {r.title}</span></Link>
                </li>
              ))}
              {data.today_tasks.length > 20 && <li className="text-xs text-zinc-400">Showing 20 of {data.today_tasks.length}</li>}
            </ul>
          )}
        </WidgetCard>

        <WidgetCard
          title="Pipeline overview"
          loading={loading && !data}
          error={pipelineErrors[0]?.message ?? null}
          onRetry={() => fetchSummary(threshold)}
          stale={stale}
        >
          {!data ? null : (
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-1.5">
                {PIPELINE_STAGES.map(s => {
                  const count = data.pipeline.find(p => p.stage === s)?.count ?? 0;
                  return (
                    <Link
                      key={s}
                      href={`/customers?stage=${s}`}
                      aria-label={`${s} — ${count} customers`}
                      className="rounded-lg border bg-white px-2 py-3 text-center hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
                    >
                      <div className="text-[11px] font-medium tracking-wide text-zinc-500">{s}</div>
                      <div className="mt-1 text-lg font-semibold tabular-nums">{count}</div>
                    </Link>
                  );
                })}
              </div>
              <div className="flex gap-2 text-xs">
                <Link href="/pipeline" className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800">Open Pipeline →</Link>
                <Link href="/customers" className="rounded-md border bg-white px-3 py-1.5 hover:bg-zinc-50">All customers</Link>
              </div>
              <p className="text-[11px] text-zinc-400">Seven fixed stages, including zeros. Counts are owner-scoped, from a single bounded query.</p>
            </div>
          )}
        </WidgetCard>

        <WidgetCard
          title={`Pending · ≥${threshold}d inactive`}
          count={data?.pending_customers.length}
          loading={loading && !data}
          error={pendingErrors[0]?.message ?? null}
          onRetry={() => fetchSummary(threshold)}
          stale={stale}
          empty={!!data && data.pending_customers.length === 0}
        >
          {!data ? null : data.pending_customers.length === 0 ? (
            <p className="text-sm text-zinc-500">No pending customers under {threshold} days — every customer had a Note or Task recently. Pending = no Note/Task newer than threshold (stage history alone doesn’t count).</p>
          ) : (
            <ul className="space-y-2">
              {data.pending_customers.slice(0, 20).map(r => (
                <li key={r.customer_id} className="rounded-lg border bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/customers/${r.customer_id}`} className="text-sm font-medium hover:underline">{r.company_name}</Link>
                    <Badge value={r.stage} />
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {r.last_activity_at ? (
                      <>Last {r.last_activity_type} · {fmtIso(r.last_activity_at)} · <span className="font-medium text-zinc-700">{r.inactive_days}d ago</span></>
                    ) : (
                      <>No notes/tasks yet · <span className="font-medium text-zinc-700">{r.inactive_days}d since creation</span></>
                    )}
                  </div>
                </li>
              ))}
              {data.pending_customers.length > 20 && <li className="text-xs text-zinc-400">Showing 20 of {data.pending_customers.length}</li>}
            </ul>
          )}
        </WidgetCard>
      </div>

      {data?.errors && data.errors.length > 0 && (
        <Card><CardBody>
          <p className="text-xs font-medium text-zinc-700">Partial data — some widgets failed to load, others are shown:</p>
          <ul className="mt-1 list-disc pl-5 text-xs text-zinc-500">
            {data.errors.map((e, i) => <li key={i}><span className="font-medium">{e.widget}</span>: {e.message}</li>)}
          </ul>
        </CardBody></Card>
      )}

      <p className="text-center text-[11px] text-zinc-400">
        One bounded request to <code className="rounded bg-zinc-100 px-1 py-0.5">GET /api/dashboard/summary?threshold={threshold}</code> — no N+1, no polling. Timezone {DASHBOARD_TIMEZONE}. Refresh is manual + AbortController-guarded; stale responses never overwrite newer data.
      </p>
    </div>
  );
}
